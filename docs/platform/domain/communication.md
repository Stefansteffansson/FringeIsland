# Domain Service — Communication (DS-5)

<!-- Valid service slugs: world-model | narrative | journeys | content | communication | discovery | intelligence -->

---
slug: communication
owner: platform/domain/communication
consumers: [products/hub, products/gimbal, platform/domain/discovery, platform/domain/intelligence]
status: proposed
last_updated: 2026-07-19
tier: Domain Services
tags: [domain-service:communication]
feature_prefix: PD
---

> One file per FringeIsland-specific domain service. Domain services sit between Platform Core (domain-agnostic) and Surfaces (products + studios). They expose contracts that anything in the Surfaces tier may consume.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

**Derivation note (this draft).** Step 1 (cold derivation) authored 2026-06-10 in the DS-5 descent session (opener: `docs/planning/sessions/openers/ds5-communication-descent-opener.md`; no FIRST DECISION — DS-5's name is unchallenged). Authority chain: root + platform + domain `CLAUDE.md` cascade (L1 — **the platform tier file carries the load-bearing notifications text:** *"The platform emits notification triggers; the Communication service routes them; products surface them"*) + the domain README L2 inventory line + the **cosmology core** (the village as the FIM-only socialising commons; branches as the visible crown — own branches legible, the wider crown ambient, no rankings, no counts; cord-health visible to a friend only along a grown branch, glanceable not diagnostic, invited not imposed, self first) + the **roles core** (support roles as PC-3 per-group templates; the per-group role renamed **Participant**; governance by scope — community-scoped care woven in-place, universe-scoped on the Console) + the Session B conformance register Section 3 DS-5 row (*"branch-gated cord-health visibility (glanceable/invited/self-first); village social surfaces FIM-only"*) + ADR-U023 + **ADR-U021 (the entity-specific lock: forum anonymisation as soft-flag display logic, data never mutated)** + ADR-U002 (notifications-as-communication explicitly rejected; the vertical is "internal listener, outward deliverer") + ADR-U016 (the cascade template's "Communication: [what happens to messages/forums]" slot) + ADR-U031 (Mist ephemerality; village + deep place 3 FIM-only, S45) + ADR-U003 (Supabase Real-time as subscription substrate) + ADR-U006/U007/U028 (group pattern; permission model; gate-by-scope) + ADR-U025/U026 (boundary input: feature-grain keying; no studio writes to DS-5) + the carry-forward priors from the DS-4 closing bridge (the DS-5 pickup block). Two structural questions were resolved at this descent's Step 1 checkpoint (ratified by Stefan, 2026-06-10): the attachment seam (DS-4 §8 Q7 — attachments are DS-4 assets referenced opaquely by ID; the sanctioned `content.md` §8 Q7 amendment lands at Step 3) and the notifications boundary (the vertical owns the obligation; DS-5 owns routing and in-platform delivery; products surface). Three sibling re-checks confirmed without revision (journeys.md enrolment-context consumption; world-model.md branch-gated visibility direction; narrative.md conversation-or-feeds). Code, migrations, and feature specs were **not read** at Step 1, per the cold-derivation discipline. Step 2 (code-informed stress-test) and Step 3 (adjudication) are recorded at the foot of §L3.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023). Revised when the service's boundaries, public contract, or dependencies change.*

### 1. Purpose

DS-5 Communication owns the platform's conversational and social-fabric state: direct messages and conversations (pair and group grain), group-scoped forums (threads, posts, replies), activity feeds, the routing and in-platform delivery of notifications emitted by every layer, and the social surfaces through which the world's relational fabric becomes conversable — journey-scoped social surfaces (consuming DS-3 enrolment context) and the branch-gated cord-health glance (consuming DS-1's gate). In canon terms, DS-5 is the platform shape of the village's socialising function and of talk along grown branches.

DS-5 is **not**: the social graph itself (branches, the crown, branch glow are DS-1 world-state — DS-5 surfaces conversation *along* branches, it never owns the bond); the Notifications vertical's obligation (every layer emits its own notification triggers per ADR-U002 — DS-5 routes and delivers in-platform, it never originates another layer's obligation); attachment substance (forum/DM attachments are DS-4 assets referenced opaquely by ID — the ratified §8 Q7 resolution at DS-4's spec); profile or avatar presentation in communication surfaces (PC-2/PC-3 identity-presentation substrate, settled at DS-4's descent — DS-5 consumes it); groups, membership, or permission resolution (PC-3 — forums scope to PC-3 groups, consumed not redefined); the Whisp's dialogue in any face (the Whisp split is decided: DS-1 world-presence / DS-7 being — Whisp dialogue is not DS-5 conversational state); search, recommendation, or ranking over communication content (DS-6 Discovery — feeds here are ambient and unranked by invariant); and moderation governance policy (PC-4 / governance by scope — DS-5 exposes the in-place moderation surface a Steward uses; the authority model is PC-3/PC-4's).

### 2. Concepts

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| Conversation | A bounded message exchange between participants — pair or group grain. Conversation kinds are data-driven, never a sealed enum (Ferd non-closure). *(Amended 2026-07-19, A-COM C-A / CB-7: group grain moves from forward commitment to in-build — FEAT-PD008 replaces the D15 pair-column shape with a participants junction + `conversation_kinds` registry, `dm` + `group` seeded; per-participant read-state moves to the junction.)* | DS-5 tables |
| Message | One utterance within a conversation: author, body, timestamps, optional opaque DS-4 attachment references. | DS-5 tables |
| Forum thread | A persistent, group-scoped discussion container. Realized as a **top-level post** (`parent_post_id` NULL) with **flat replies** — the `enforce_flat_threading` trigger forbids nesting; no separate thread table exists. | DS-5 tables |
| Forum post | One contribution within a thread (top post or reply). Retains its original `author_id` forever — attribution is display logic over current membership (ADR-U021). | DS-5 tables |
| Feed event | One item of ambient social awareness composed into a feed — chronological, unranked, uncounted. Event kinds are data-driven. | DS-5 tables |
| Notification record | A routed delivery of a trigger some layer emitted: recipient, source event, channel, delivery/read state. | **Vertical delivery substrate** (`public.notifications`, platform-side — ADR-U048): any tier writes it as obligation-fulfilment; DS-5 owns the routing layer above it |
| Notification preference | A FIM's per-kind/per-channel delivery choices. Consent state itself stays authoritative in Platform Core. | DS-5 tables |
| Attachment reference | An opaque DS-4 asset ID carried as message/post metadata. The artifact is DS-4's; the act of attaching is DS-5's. | DS-5 tables (reference only) |
| Participation & read state | Per-participant conversation/thread state: membership in the conversation, unread cursors, mute. | DS-5 tables |

### 3. Public contract (consumed by Surfaces)

Contract families (operation grain firms at FEAT time; the families are the L2 commitment):

- **Conversation & message operations** — open/join/leave a conversation; send a message (with optional opaque attachment references); read history; live delivery per the **ADR-U039 socket doctrine** — server-originated content-free hints on private broadcast channels, ping-then-fetch, verify-on-signal; a hint is never an authority and the fetch is the authorized path. *(Amended 2026-07-19 at the A-COM C-A decomposition: the original "realtime subscription to new messages (Supabase Real-time substrate, ADR-U003)" predates ADR-U039, which retired the `postgres_changes` full-row-push shape for v2 — the spec yields, PROCESS §9.)* Writes gate by scope (participants write to their conversations; `has_permission` for group-grain operations).
- **Forum operations** — create thread, post, reply within a group's forum; read gated by group membership (PC-3); **attribution resolution** — the contract serves author display via current-membership lookup, never by mutating stored rows (ADR-U021's law as contract shape).
- **Moderation operations (community-scoped, in-place)** — the Steward's woven-in-place care surface for their own group's forums and conversations (governance by scope: community-scoped stays in the FIM experience; universe-scoped lives on the Console and is not a DS-5 contract).
- **Feed reads** — per-FIM and per-group ambient feeds; chronological; no rankings, no counts (service-level invariant 2). Realtime subscription for live surfaces.
- **Notification operations** — list/mark-read for in-platform notifications; preference get/set. Trigger *emission* is every layer's own obligation; DS-5's contract receives, routes, and serves.
- **Cord-health glance surface** — the social-context read through which a friend's cord health appears, served only where DS-1's branch gate grants it (glanceable not diagnostic, invited not imposed, self first). DS-5 composes the surface; DS-1 evaluates the gate.

Consumers: the Hub and Gimbal surface all families (equipment-keying stays feature-grain at the surfaces, ADR-U025); **provisional sibling consumer lines** (sibling-undefined rule — each re-checks at its descent): DS-6 Discovery may read forum/feed content for search indexing; DS-7 Intelligence may read communication context for profile accumulation (privacy posture per its own descent). No studio writes to DS-5 (ADR-U026 — communication is lived, not authored).

### 4. Internal dependencies (consumed *from* this service)

- **Platform Core:** PC-1 Infrastructure — realtime substrate, scheduled-job substrate (pg_cron) for Mist-TTL erasure, outward-delivery substrate (§8 Q1); PC-2 Identity — FIM/Mist status (the intrinsic village-surface gate), the transcendence lifecycle event (atomic migration of Mist communication state), consent substrate; PC-3 Organisation — groups, membership, role templates, `has_permission` (P-O1: the actor primitive is `get_current_personal_group_id()`; D7: role names are TEXT-keyed `role_templates` rows); PC-4 Governance — audit discipline on moderation and lifecycle actions.
- **Other domain services:** DS-1 World Model — the branch gate and cord-health state (consumed for the glance surface; DS-5 never writes world-state); DS-3 Journeys — enrolment context for journey-scoped social surfaces (DS-3 holds no conversational state); DS-4 Content — opaque attachment-ID resolution (DS-4 serves; DS-5 references, never embeds renderable substance).

### 5. Extension points

Per Ferd non-closure (ADR-U008/U018 discipline): **conversation kinds**, **feed-event kinds**, **notification-event kinds**, and **delivery-channel kinds** are data-driven registries, never sealed enums. The registries are the extension surface; the Extension System's contracts (future wave) plug new kinds in without Platform Core changes.

| Extension point | Interface | Lifecycle |
|----------------|-----------|-----------|
| Conversation kinds | registry row + contract-family semantics | Ferd: registry exists; Extension System wave: pluggable |
| Feed-event kinds | registry row + composition rule | same |
| Notification-event kinds | registry row + routing rule | same |
| Delivery-channel kinds | registry row + channel adapter (§8 Q1) | same |

### 6. Storage & schema

Verified at Step 2 (2026-06-10): the four DS-5 tables — `forum_posts`, `conversations`, `direct_messages`, `notifications` — were all created in the D15 monolithic rebuild (`20260222000000_rebuild_universal_group_pattern.sql`; PW-1: the schema predates this partition), all RLS'd. **Every actor column is a personal-group ID** (`recipient_group_id`, `author_group_id`, `sender_group_id`, `participant_1/2` → `groups(id)`; the rebuild's own comment: "participants are personal groups" — P-O1 realized). `notifications.type` is TEXT with ~10 realized kinds (non-closure holds); sprint3 added **actionable notifications** (action columns + the generic `handle_notification_action` RPC + an expiry index; **the generic RPC and its stewardship dispatch handler were dropped 2026-07-05** — FEAT-PC014 security closure, ADR-U038 — the columns + index remain, and actionable responses ride dedicated contracts like `respond_to_stewardship_nomination`). `forum_posts` carries `is_deleted` soft-flag and `author_group_id ON DELETE SET NULL` (the platform-exit erasure shape — compatible with ADR-U021, whose group-leave display law is a different lifecycle event and is **not yet realized**: the rendered fallback is `'Unknown'`, no membership-based "Former Member" logic exists). All three realtime tables are in the `supabase_realtime` publication **by migration** (re-created in the rebuild; made idempotent at RC8 after a CHANNEL_ERROR incident). Schema posture the architecture commits to going forward: author identity immutable with anonymisation as display logic (ADR-U021); Mist-authored rows carry the ephemerality posture (TTL + explicit-erase, atomic transcendence migration, ADR-U031); realtime channel authorization aligns with RLS (§8 Q7); notification records reference their source event for observability tracing.

*(Amended 2026-07-20, doc-health after A-COM Cycle C-A — the paragraph above stands as the 2026-06-10 Step-2 disk verification; [FEAT-PD008](./features/FEAT-PD008-conversation-and-message-contracts.md) has since reshaped the conversation model: `conversations` dropped the pair columns for a `conversation_participants` junction carrying per-participant `last_read_at` read-state, plus an open `conversation_kinds` registry (`dm`, `group` seeded — §8 Q8); `direct_messages` is renamed `messages` (columns unchanged; the PC-4 `audit_admin_message_send` trigger re-created on the renamed table); one-DM-per-pair is schema-enforced on the junction; writes narrowed to the conversation/message contracts as the only door; and `conversations`/`messages` left the `supabase_realtime` publication per ADR-U039 (`notifications`' publication membership is A-NTF's disposition). `can_update_conversation()` retired with the pair columns; `is_conversation_participant()` reshaped over the junction.)*

### 7. Service-level invariants

1. **Attribution is display logic over current membership; stored communication data is never mutated for anonymisation, and posts are never deleted for member exit** (ADR-U021 — the entity-specific lock).
2. **No rankings, no counts on any social surface.** Own branches legible, the wider crown ambient (cosmology S38); feeds are chronological and unranked; anything ranked or recommended is DS-6's, reached through DS-6's own contract.
3. **Village-anchored social surfaces are FIM-only intrinsically** (S45/ADR-U031): no ball, no Beyond — the gate is PC-2 identity status, not a DS-5 fence.
4. **Mist-generated communication state is ephemeral**: TTL after inactivity + explicit-erase path; transcendence migrates it atomically and continuously (ADR-U031/S46).
5. **Every layer emits its own notification triggers; DS-5 routes and delivers in-platform; products surface** (ADR-U002 + the platform tier law). DS-5 never absorbs another layer's emission obligation.
6. **All kind sets are data-driven registries, never sealed enums** (Ferd non-closure): conversation kinds, feed-event kinds, notification-event kinds, channel kinds.
7. **Cord-health crosses DS-5 surfaces only along a grown branch — glanceable not diagnostic, invited not imposed, self first** (DS-1's gate; Privacy holds the consent surface; gate denials are observability events).
8. **Communication state references content opaquely by DS-4 ID and never embeds renderable substance** (the ratified attachment-seam position; the opaque-reference direction pattern at n=4).
9. **Writes gate by scope** (`has_permission` over PC-3 role templates; ADR-U007/U028): community-scoped moderation stays woven in-place (the Steward), universe-scoped governance stays on the Console — never a DS-5 surface.

### 8. Open questions

- **Q1 — Outward delivery shape** *(speculative-third-shape)*. ADR-U002 names the vertical "internal listener, outward deliverer"; the platform tier law makes DS-5 the router. Where does outward delivery (email, push) sit — DS-5 channel adapters over PC-1 substrate, PC-1 directly, or vertical-owned plumbing? Cold lean: DS-5 routes to channel adapters; PC-1 owns transport substrate. Resolves at the Notifications vertical's obligation-inventory derivation or FEAT time. **Partially resolved at the C-D design session (2026-07-20, ADR-U049): the seam is fixed** — recipients are resolved exactly once, by the DS-5 routing contract at send-time, materialized as V3 delivery rows (ADR-U048's substrate); any outward channel consumes delivery rows downstream and never re-resolves recipients. The residue — whether channel adapters are DS-5-owned code or PC-1/vertical plumbing — stays open and resolves at the Notifications vertical's obligation-inventory derivation (A-NTF), as above.
- **Q2 — Mist access to DM/forums.** Near side is open to Mists; forums scope to PC-3 groups and the village is FIM-only — but can a Mist converse at all (e.g. with a Guide on the near side)? Cold lean: Mist conversational capability is minimal and ephemeral wherever it exists; the gate is identity status + group membership, both PC substrate. Routes to PC-2/Privacy adjudication.
- **Q3 — The "Former Member" vocabulary. RESOLVED at Step 3 (2026-06-10): the law stands, unrealized.** Step 2 found zero "Former Member" (or any membership-based attribution display) in code — the realized fallback is `'Unknown'` when author resolution fails. ADR-U021's display law is forward commitment, not contradicted; no ADR edit needed. The vocabulary half (whether the canon-facing string becomes "Former Participant" per the roles-core rename, or stays as plain-English "member of the group") is a FEAT-time naming call under the dual-reading discipline — recorded here, not parked as an open question.
- **Q4 — Feed composition vs DS-6 boundary. RESOLVED at the DS-6 descent (2026-06-11, ratified):** the cold lean stands as law — **any selection beyond chronology + scope filters is DS-6's; a "relevant to you" surface is never DS-5's, even when embedded in feed UI** — it is a DS-6 recommendation surface reached through DS-6's own contract (discovery.md invariant 2 binds it to affinity-shaped, never popularity/comparative). DS-5's feed composition stays chronology + scope filters, full stop. The search-indexing consumer line (§3) was likewise confirmed from the owned side (posture per discovery.md §8 Q3).
- **Q5 — Whisp-carried messages** *(speculative-third-shape)*. Does the Whisp ever carry FIM-to-FIM communication? Cold lean: no — the branch is the FIM-FIM channel (S36); Whisp dialogue is DS-7's being-face. Defers to DS-7's descent. **Resolved 2026-06-11 (DS-7 descent, ratified by Stefan): the cold lean confirmed from the owned side — no. The Whisp never carries FIM-to-FIM communication (`intelligence.md` §7 invariant 10); the branch is the FIM-FIM channel.**
- **Q6 — The village-presence seam** *(speculative-third-shape)*. Ambient "who is at the Tree" awareness: presence/location is DS-1 world-state; conversation in the village is DS-5. Which service serves presence-in-social-context — DS-5 composing DS-1 reads, or DS-1 directly to surfaces? Cold lean: DS-1 owns presence; DS-5 composes it into social surfaces the same way it composes cord-health glances. Re-check against DS-1 at FEAT time.
- **Q7 — Realtime channel authorization. RESOLVED by ADR-U039 (recorded 2026-07-19, A-COM C-A).** The question was asked of the `postgres_changes` shape, which ADR-U039 retired for v2: subscribers never receive rows at all — channels are **private broadcast** carrying server-originated content-free hints (RLS on `realtime.messages` gates topic receipt; the session-signal channel is the realized precedent), and the client acts via the authorized fetch path (verify-on-signal). The filter-vs-policy worry dissolves — there is no row payload for a filter to leak. The conversational tables leave the `supabase_realtime` publication at C-A (FEAT-PD008 rider); `notifications`' publication membership is dispositioned at A-NTF.
- **Q8 — Group-conversation vs forum boundary. FIRMED 2026-07-19 (A-COM C-A / CB-7, FEAT-PD008).** The cold lean stands as built shape: distinct kinds in one registry space — the `conversation_kinds` registry (`dm`, `group` seeded; TEXT-keyed, open) carries group-grain conversations as presence-shaped exchange scoped to a PC-3 group; forums remain `forum_posts` persistent threaded discourse. The boundary is a kind property, not an enum wall; ad-hoc multi-party (non-group-scoped) conversations are a future kind row, zero schema change.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the service enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|
| Conversation lifecycle (open/join/leave; kinds data-driven) | Conversations & DM | — | PC-3 (membership, permissions); PC-2 (identity status) | Privacy (conversation data is FIM data, RLS); Administration (account-exit cascade); Observability (lifecycle events) |
| Message exchange & realtime delivery | Conversations & DM | Conversation lifecycle | PC-1 (realtime substrate); DS-4 (opaque attachment IDs) | Privacy (RLS, least privilege); Notifications (message-received trigger emission); Observability (delivery outcomes) |
| Participation & read state | Conversations & DM | Conversation lifecycle | PC-2 (per-FIM state) | Privacy (per-FIM state); Observability (state-change events) |
| Group-scoped forum structure (threads, posts, replies) | Forums | — | PC-3 (group scoping, membership) | Privacy (membership-gated RLS); Administration (group-retirement cascade); Observability (post events) |
| Membership-status attribution display (ADR-U021) | Forums | Forum structure | PC-3 (current-membership lookup) | Privacy (identity display by membership, never mutation); Administration (exit cascade renders Former-Member display) |
| Community-scoped moderation surface | Forums | Forum structure | PC-3 (`has_permission`, role templates); PC-4 (audit) | Administration (in-place moderation primitives); Observability (moderation actions audited); Privacy (least-exposure of moderated content) |
| Activity-feed composition & delivery (ambient, unranked) | Feeds & social surfaces | — | PC-3 (scope filters); PC-1 (realtime) | Privacy (platform-level filtering); Observability (composition outcomes) |
| Journey-scoped social surfaces | Feeds & social surfaces | Conversation lifecycle; Feed composition | DS-3 (enrolment context) | Privacy (enrolment-scoped visibility); Observability |
| Branch-gated cord-health glance surface | Feeds & social surfaces | Feed composition | DS-1 (branch gate + cord-health reads); PC-2 (consent substrate) | Privacy (the consent triple: glanceable/invited/self-first); Observability (gate denials recorded) |
| Notification routing & in-platform delivery | Notification routing | — | PC-1 (realtime; scheduled jobs); every layer (trigger emission per ADR-U002) | Notifications (the routing half of the vertical law); Privacy (recipient-scoped RLS); Observability (delivery tracing to source event) |
| Notification preferences & consent surface | Notification routing | Notification routing | PC-2 (consent authoritative in Core) | Privacy (consent state asked, not inferred); Notifications (preference-respecting delivery) |
| Attachment referencing (attach/detach as message metadata) | Attachments & content references | Message exchange; Forum structure | DS-4 (asset registry, ID resolution) | Privacy (references are FIM data); Administration (retirement cascade joint with DS-4) |
| Communication lifecycle cascades (ADR-U016 slot) | Lifecycle & retention | all areas | PC-2/PC-3 (lifecycle events); PC-4 (audit) | Administration (the cascade slot itself: member exit, group retirement, account decommission); Observability (cascade execution); Notifications (lifecycle triggers) |
| Mist-communication ephemerality (ADR-U031) | Lifecycle & retention | Conversation lifecycle; Forum structure | PC-2 (Mist status, transcendence event); PC-1 (pg_cron TTL jobs) | Privacy (data minimisation, TTL + explicit-erase); Administration (erasure execution); Observability (erasure events) |

### Dependency chain

Foundations first: **conversation lifecycle** and **forum structure** stand directly on PC-3 substrate and unblock their areas. **Message exchange** follows conversation lifecycle (and brings the PC-1 realtime substrate online — the same substrate **feed composition** and **notification routing** reuse). **Attribution display** and **moderation** follow forum structure. **Notification routing** is independently foundational (it depends on platform-wide trigger-emission conventions, not on other DS-5 capabilities) and unblocks **preferences**. The three social-surface capabilities are consumers-last: **journey-scoped surfaces** wait on DS-3's enrolment contract, the **cord-health glance** waits on DS-1's branch-gate contract, **attachment referencing** waits on DS-4's registry contract. **Cascades** and **Mist ephemerality** span all areas and must be cascade-specified (ADR-U016) before any capability ships, but build last-to-first as cross-cutting passes.

### External dependencies

| Source | Capability consumed | Consuming internal area |
|---|---|---|
| PC-1 Infrastructure | Realtime substrate; pg_cron scheduled jobs; outward-delivery substrate (§8 Q1) | Conversations & DM; Notification routing; Lifecycle & retention |
| PC-2 Identity | FIM/Mist status; transcendence lifecycle event; consent substrate | all areas (gating); Lifecycle & retention |
| PC-3 Organisation | Groups, membership, role templates, `has_permission` | Forums; Conversations & DM; Feeds & social surfaces |
| PC-4 Governance | Audit discipline | Forums (moderation); Lifecycle & retention |
| DS-1 World Model | Branch gate + cord-health reads (`world-model.md` §3 Cord operations names DS-5 as the consumer — verified this session) | Feeds & social surfaces |
| DS-3 Journeys | Enrolment context (`journeys.md` §3 consumers line names DS-5 — verified this session) | Feeds & social surfaces |
| DS-4 Content | Opaque attachment-ID resolution (`content.md` §3 — the ratified Q7 seam) | Attachments & content references |

### Sources-status block

- **State-read remarks (this session):** the DS-3 closing bridge carries zero literal DS-5 mentions — the DS-4 bridge is the complete DS-5 pickup carrier (non-material). The **platform tier CLAUDE.md** carries the load-bearing notifications routing text the opener cited only via ADR-U002 — recorded here as the L1 anchor for invariant 5. The roles core's **Participant** rename vs ADR-U021's "Former Member" display text is armed as §8 Q3 (naming-drift dual-reading).
- **Seam resolutions (this session, ratified at the Step 1 checkpoint):** (1) **the attachment seam (DS-4 §8 Q7, routed here): attachments are DS-4 assets referenced opaquely by ID** — DS-5 owns the attach/detach act as metadata, never the artifact; extends the opaque-reference direction pattern to n=4; the sanctioned `content.md` §8 Q7 amendment lands at Step 3. (2) **The notifications boundary: the vertical owns the obligation, DS-5 owns routing + in-platform delivery, products surface** (ADR-U002 + platform tier law); outward delivery is §8 Q1. (3) Three sibling re-checks **confirmed without revision**: journeys.md (DS-5 consumes enrolment context; DS-3 holds no conversational state), world-model.md (DS-1 owns branch/cord state and the gate; DS-5 consumes, never the reverse), narrative.md ("conversation or feeds (DS-5)").
- **L2-line altitude:** the README line "DM, forums, activity feeds" omits notification routing (explicitly DS-5's at the platform tier file), the cord-health glance surface, the U021 attribution law, and lifecycle cascades. Line revision is a Step 3 output candidate.
- **Sibling specs:** DS-1/DS-3/DS-4 were consulted **only** for the named seams (boundary input, not capability source); narrative.md lightly for its boundary line. DS-6/DS-7 remain undefined: the consumer lines and Q4/Q5 are provisional per the sibling-undefined rule — each re-checks at its descent.
- **No code, migrations, or FEAT-* files read** at Step 1. The Step 2 expectation is **stated in advance for Step 2 to verify rather than assume** (calibrated at opener authoring): DS-5 is **code-rich** — `forum_posts`, `conversations`, `direct_messages`, `notifications` in the 19-table baseline; 10 live + 16 archived migration files carry DS-5 vocabulary; `lib/messaging/MessagingContext.tsx`, `lib/notifications/NotificationContext.tsx`, `lib/types/messaging.ts`, ~14 surface files; zero messaging hooks (contexts carry the client mechanism). Expected: a non-zero Step 2 with a **mixed forward-commitment profile** (the DS-3 shape); the retraction-rate series records its sixth point here (PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0).
- **Canon-sub-page note:** no dedicated communication core exists under `docs/ecosystem/universe/` — DS-5's canon authority is the cosmology core's village/branch/cord sections plus the roles core, not a per-entity sub-page (the DS-3 precedent remark shape; proceed-with-remark).

### §L3 Step 2 — code-informed stress-test (run 2026-06-10, same session, ratified)

*Sweep scope: `supabase/migrations/` cumulative-forward (A#8) incl. `archive/`; `lib/messaging/` + `lib/notifications/` + `lib/types/messaging.ts`; `app/` + `components/` surface files (14); `app/api` directory enumeration. Term set: forum/forum_posts, conversation(s), direct_message(s), notification(s), message, feed, thread, post, attachment/attach (word-boundary second method), "Former Member"/"Former Participant", notification_preference, publication/supabase_realtime. Every zero-hit claim dual-method verified (template §6).*

**Class 1 — confirms (9):** the four tables exist as carried, all RLS'd, all born in the D15 rebuild (PW-1). P-O1 realized at every DS-5 actor column. **The ratified notifications boundary is on disk:** PC-3-tier triggers (`notify_invitation_*`, `notify_role_*`, `notify_group_deleted` on `group_memberships`/`user_group_roles`/`groups`) and lifecycle functions (sprint2 leave-group, sprint4 platform-exit) INSERT INTO `notifications`; the DS-5 substrate routes; `NotificationBell` surfaces — invariant 5's exact shape. **A#9 fired at its named site:** the realized contract surface is framework mechanisms — Realtime `postgres_changes` subscriptions in both contexts, PostgREST, and RPCs (`handle_notification_action`) — with **zero custom API routes touching DS-5 tables** (dual-method: content grep + `app/api` directory enumeration: admin/users, invitations/send-email, v1/journeys* only). **Attachment substrate: zero** (dual-method) — the Q7 seam resolution is forward-only. Notification preferences: zero (patterns: `notification_preference`, `notif.*preference` across migrations/lib/app) — full-forward. Moderation realized (`forum_update_moderate` policy). U016 cascades partially realized (member_left / exit notifications to Stewards/DeusEx). **PW-MARCH1: clean recovery** — the realtime publication was re-created in the rebuild (L2020-2022) and made idempotent at RC8; the archived `remove_dm_notification_trigger` was deliberate pre-D15 retirement, not loss.

**Class 2 — entity-internal deltas (7, folded inline above):** pair-grain-only conversations (§2/§6); flat threading, no thread table (§2/§6); actionable notifications (§6); `notifications.type` TEXT registry posture already realized (§6); ADR-U021 display law unrealized — `'Unknown'` fallback, `ON DELETE SET NULL` platform-exit erasure shape (§6, §8 Q3); type coverage partial by omission — `messaging.ts` covers Conversation/DirectMessage only, no forum/notification types in `lib/types/` (PW-T1); outward email delivery realized once, open-coded per-feature (`app/api/invitations/send-email`) — §8 Q1's channel-adapter lean anchor.

**Class 3 — cross-entity findings (3, routed to pickups):** PC-3-tier triggers + PC-4 admin functions write `public.notifications` directly (rebuild L1379-1401; sprint2 L232+) and `audit_admin_message_send` (PC-4) fires on `direct_messages` — both route to the **cross-tier-write channel anchored at DS-3** (new anchors recorded; not resolved here). The stewardship-nomination flow (`nominate_steward` RPC, ~60% of sprint3's body) rides inside the notifications-named migration — the **#4 migration-name-as-shorthand watch's first decisive firing** (n=5 opportunities); methodology routing, not a substance pickup.

**Retraction-rate data point: DS-5 = 0 cold retractions** (series: PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0; DS-5 0 with 7 Class 2 deltas) — deltas-not-retractions holds at the second code-rich entity. **Forward-commitment profile: mixed, ~7 partial / 7 full-forward** (the DS-3 shape, as the opener calibrated). Partial: conversation lifecycle (pair grain), message exchange, participation/read state (inline), forum structure (flat), moderation, notification routing & delivery (incl. actionable), lifecycle cascades. Full-forward: attribution display (U021), feed composition (zero feed substrate), journey-scoped social surfaces, cord-health glance, notification preferences, attachment referencing, Mist ephemerality.

### §L3 Step 3 — adjudication outputs (run 2026-06-10, same session, ratified)

**Q-resolution slate:** Q3 resolved (law-stands-unrealized; no ADR edit); Q7 narrowed to FEAT-time filter-vs-policy verification (realized half recorded). Deferred-routed as written: Q1 → the Notifications vertical's obligation-inventory derivation (anchor: the open-coded send-email route); Q2 → PC-2/Privacy adjudication; Q4 → DS-6 descent (provisional); Q5 → DS-7 descent (cold: no); Q6 → DS-1 seam at FEAT time; Q8 → FEAT time (kind property, not enum wall). **The one sanctioned cross-entity edit landed this session:** `content.md` §8 Q7 records the ratified attachment resolution (DS-4 assets referenced opaquely by ID; the opaque-reference direction pattern at n=4). Three sibling re-checks confirmed without edits (journeys.md, world-model.md, narrative.md). **Zero ADR amendments** (U021 unrealized-not-contradicted; U002 realized in shape). The domain README DS-5 L2 line was revised (altitude finding) and the domain CLAUDE.md existing-specs enumeration updated in this session's commits.

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PD###.md` file under this service's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`.*

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| Conversation lifecycle (open/join/leave; kinds data-driven) | [FEAT-PD008](./features/FEAT-PD008-conversation-and-message-contracts.md) | 6-done | A-COM Cycle C-A; group grain realized per CB-7 (participants junction + kinds registry) |
| Message exchange & realtime delivery | [FEAT-PD008](./features/FEAT-PD008-conversation-and-message-contracts.md) | 6-done | **Partial:** exchange contracts only; live delivery is [FEAT-PD010](./features/FEAT-PD010-realtime-hint-emission.md) (next row) |
| Message exchange & realtime delivery (live-delivery half) | [FEAT-PD010](./features/FEAT-PD010-realtime-hint-emission.md) | 6-done | A-COM Cycle C-C — the ADR-U039 hint layer: trigger-emitted content-free hints on `account:<auth_uid>:conversations` + `group:<group_id>:forum` (the forum channel extends the forum-structure capability's surface), `realtime.messages` receive policies (§8 Q7), no client-send door; conventions set for the A-NTF bell tenant |
| Participation & read state | [FEAT-PD008](./features/FEAT-PD008-conversation-and-message-contracts.md) | 6-done | Read-state moves to the participants junction |
| Group-scoped forum structure (threads, posts, replies) | [FEAT-PD009](./features/FEAT-PD009-forum-and-attribution-contracts.md) | 6-done | A-COM Cycle C-B; contracts over the D15 substrate, write-narrowed; flat threading stays trigger-enforced |
| Group-scoped forum structure (windowed own-edit/delete sliver) | [FEAT-PD011](./features/FEAT-PD011-announcements-window-and-reports-contracts.md) | 5-in-cycle | A-COM Cycle C-D — CB-3: `edit_own_forum_post` / `delete_own_forum_post`, 15-minute window, contracts-only door; DMs stay immutable (regression-held) |
| Membership-status attribution display (ADR-U021) | [FEAT-PD009](./features/FEAT-PD009-forum-and-attribution-contracts.md) | 6-done | The COM-14 ladder ("Former member" per CB-9, 'Unknown' fallback); applies to forum + conversation detail; display law, never data mutation |
| Community-scoped moderation surface | [FEAT-PD009](./features/FEAT-PD009-forum-and-attribution-contracts.md) | 6-done | **Partial:** soft-delete moderation contract only; the reports store lands at C-D (next row, CB-4); the queue surface defers to A-ADM |
| Community-scoped moderation surface (reports-store sliver) | [FEAT-PD011](./features/FEAT-PD011-announcements-window-and-reports-contracts.md) | 5-in-cycle | A-COM Cycle C-D — `content_reports` + `submit_content_report` (snapshot-at-report, idempotent resubmit); the admin SELECT is the ADM-10 queue seam |
| Notification routing & in-platform delivery (announcements sliver) | [FEAT-PD011](./features/FEAT-PD011-announcements-window-and-reports-contracts.md) | 5-in-cycle | A-COM Cycle C-D — ADR-U049: durable `announcements` home + send-time fan-out of V3 delivery rows (the U048 split realized; §8 Q1 seam fixed); preferences/digest and the bell stay forward (A-NTF) |
| (remaining seven) | — | — | No FEAT-PD specs yet; realized notification code predates this partition (see §L3 Step 2). C-E specs lifecycle cascades + Mist ephemerality + export (CB-1/CB-6); the announcements routing sliver is specced at C-D (FEAT-PD011 above, live delivery at C-C, FEAT-PD010); feeds, cord-health glance, journey-scoped surfaces, attachments, and preferences stay forward (A-NTF / A-DIS / later). |

### Capabilities without specs

The remaining seven above. Candidates for future L4 runs; wave-scope determination is wave-planning's, not L3's.

### Features without capabilities

None.

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
