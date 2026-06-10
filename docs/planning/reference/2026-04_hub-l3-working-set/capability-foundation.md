# The Hub — Capability Foundation

**Purpose.** This document is the clean-slate capability foundation for the Hub — the browser-based FringeIsland product. It assumes nothing has been built yet. It says *what the Hub must support*, not *how the current system happens to do it*. It is intended to anchor feature specifications: every feature should map to one or more capabilities listed here, and every capability listed here should — eventually — be served by one or more features.

**Conventions.**
- The Hub *provides* a capability when an external actor (visitor, member, steward, admin) can rely on it. The Hub *does not* provide a capability when it is explicitly out of scope.
- Capabilities are numbered within each cluster (e.g., `4.3`) so feature specs can cite them.
- This document deliberately omits implementation choices (database, framework, transport, naming conventions, wire protocols). It also omits release timing — the capability map is the full target, not a release plan.
- Wherever a parameter would normally be a number (an expiry window, a permission count, a debounce), the capability says *configurable* and leaves the number to a feature spec or an operational decision.

---

## 1. Foundational principles

These are not capabilities. They are the *constraints* on every capability that follows. Any capability that would violate one of these principles is wrong, regardless of how useful it might seem.

### 1.1 The three questions
The Hub exists to hold three questions for its members: **Who am I? What do I want? How do I get there?** It does not answer them. It gives them space, structure, and companionship so each member can find their own answers.

### 1.2 The three worlds
The Hub is the browser-based expression of the **Safe Harbour** — one of three worlds in the FringeIsland cosmology. The other two are the **Ordinary World** (life outside the platform) and **The Other Side** (deeper water, where narrative, challenge, and transformation live). The Hub acknowledges the Ordinary World and prepares members to encounter The Other Side. Eventually, the Hub's interface itself is meant to *feel* the difference between the worlds — colour, typography, ambient elements, and emotional register shift as the member moves between them.

### 1.3 Non-negotiable principles
- **Non-judgment.** The Hub takes no position on questions of meaning or continuity. It guides members toward their own answers.
- **Stories as entertainment first.** Developmental themes are invisible in the foundation layer. Learning emerges implicitly from experience.
- **Developmental interdependence.** Growth is structurally social. The platform makes collective participation a real path, not a marketing claim.
- **Privacy over commercial opportunity.** Member data serves the member, not the platform.
- **Direction over destination.** The Hub orients. It does not prescribe.

### 1.4 The emotional register
The Hub feels **calm, oriented, purposeful**. Progress is visible but never competitive. There are no leaderboards, no badges-as-status, no manipulative streaks. Groups are the primary social container; nothing in the Hub uses gamification as a substitute for meaning.

### 1.5 Actors
The Hub recognises a small, deliberate cast of actors:

- **Visitor** — anyone using the Hub without an account.
- **FIM (FringeIsland Member)** — anyone 18 or older with an account.
- Within any group, a FIM holds one of the four engagement-group roles: **Steward** (cares for the group), **Guide** (facilitates the learning), **Member** (participates), **Observer** (follows along supportively).
- **Dreamineer** — a contributor archetype: members who create journeys, narrative arcs, and universe content. Dreamineers' authoring tools are not part of the Hub, but Dreamineers participate in the Hub as members and as a contributor community.
- **DeusEx** — platform administrators, organised as a system group like everything else.

The Hub does not serve users under 18.

---

## 2. Identity & Access

The Hub treats identity as a continuous spectrum, not a binary. A person can browse and even begin participating before signing up; signing up converts the temporary identity into a permanent one without loss.

### 2.1 Visitor identity
The Hub provides each visitor with a temporary identity from the moment they arrive, without requiring sign-up. The Hub records the visitor's exploration (browsed journeys, sampled steps, choices made) against this temporary identity. The visitor's experience is real, not a preview.

### 2.2 Member identity
The Hub provides authenticated, persistent identity for FIMs. A member has a primary credentialed identity (e.g., an authenticated account) and a stable internal identifier that never changes across the member's lifetime.

### 2.3 Visitor-to-member conversion
The Hub converts a visitor identity into a full member identity on sign-up *without losing any of the visitor's prior activity*. Progress, choices, and any in-flight journey participation continue seamlessly under the new account. The conversion is a soft threshold, not a wall.

### 2.4 Authentication and session
The Hub authenticates members and maintains a session that survives normal navigation. It refreshes the session transparently when needed. It signs the member out cleanly on request and on session expiry.

### 2.5 Profile
Each member has a profile composed of a small static core (full name, avatar, biography) and a flexible accumulating record (assessments, reflections, insights, intentions) that grows with engagement. The accumulating record is structured so that downstream capabilities — companion intelligence, discovery, governance, analytics — can reason about it without fragmenting it.

### 2.6 Display name
Each member chooses how they appear to others. The display name is independent of the member's legal/full name; a member can use their real name, a nickname, or any other handle the Hub permits, and they can change it later. The display name is the primary identifier other members see in social surfaces (forums, messages, member lists, invitations).

### 2.7 Personal Journal
The Hub provides each member with a private writing surface — a Journal — for free reflection. Journal contents are never visible to anyone but the member, are never derived-from for analytics or recommendations without explicit consent, and persist across the member's lifetime.

### 2.8 Account states
The Hub supports a multi-stage account lifecycle: **active** (normal use), **deactivated** (temporarily blocked from sign-in, reversible), **decommissioned** (permanently disabled but historically preserved, irreversible flag), and **hard-deleted** (the member's record is removed and authored content is reassigned to a sentinel "deleted user"). Deactivation, decommissioning, and hard-deletion are administrative actions; deactivation is reversible, the others are not.

### 2.9 Force-logout
The Hub can terminate a member's active sessions on demand (administrative action) and notify the member's open clients to stop trusting the previous session. The mechanism does not depend on the client cooperating.

### 2.10 Self-service exit (future capability)
The Hub provides a member-initiated path to leave the platform that mirrors administrative decommissioning, including the same lifecycle preservation guarantees. (Out of scope today; a target capability.)

---

## 3. The Group Model

Everything the Hub does about access, participation, and social structure flows through one foundational decision: *everything is a group.* This is the **Universal Group Pattern**, and it is the most consequential capability in the system.

### 3.1 Universal Group Pattern
The Hub represents every access-bearing entity as a group. People are not modelled as users-with-roles; they are modelled as personal groups (containing themselves) that can join other groups. Organisations are not modelled separately; they are engagement groups that can join other engagement groups. There are no special-case actors — visitors, members, group leaders, administrators all flow through the same membership and permission machinery.

### 3.2 Group types
The Hub distinguishes three flavours of group, by *purpose*, not by mechanism:

- **System groups** — platform-wide containers whose permissions are always active, regardless of which group context the member is currently working in. The Hub recognises a Visitor system group (implicit), a baseline Member system group (every authenticated FIM joins it on sign-up), and a Platform Administrator system group.
- **Personal groups** — auto-created per member, with exactly one member (themselves). The personal group is the member's identity bridge: when a member "joins" something, what actually joins is their personal group.
- **Engagement groups** — user-created. Where social life happens: book circles, classes, communities of practice, guide networks, organisational units.

### 3.3 Personal group as identity
The personal group is the member's public-facing identity. The member chooses its name (their display name). The personal group is what authors a forum post, sends a message, or appears in a member list — never the raw user account.

### 3.4 Group-joining-group (transitive membership)
The Hub allows engagement groups to be members of other engagement groups, with the host group assigning a role to the joining group exactly as if it were a personal group. Membership is transitive: a member who reaches a group through a chain of group memberships has the role assigned at the deepest hop. The Hub guards against circular membership at the moment a join is created.

### 3.5 Configurable transitive depth
The Hub treats transitive depth as unbounded by default and provides a configurable maximum that can be tightened operationally without schema changes if performance or cognitive load requires it.

### 3.6 Group visibility
Each engagement group has a visibility setting (e.g., public, private). The Hub provides a separate, independent setting for **member-list visibility**: a group can be discoverable while keeping its membership confidential, or vice versa.

### 3.7 Group status
Each engagement group has a lifecycle status — at minimum: **active**, **closed**, **archived**, **suspended**. The status governs what is possible inside the group (creating content, posting, enrolling, etc.) and what is preserved for review.

### 3.8 Group settings
Each engagement group exposes a settings surface owned by its Steward(s): name, description, visibility, member-list visibility, custom-role definitions, branding (where applicable), and any group-scoped policies.

---

## 4. Roles, Permissions & Authority

Authority in the Hub is dynamic, layered, and additive. There is no special "admin override" branch in the logic — administrators are simply members of a group whose role grants every permission.

### 4.1 Permission catalogue
The Hub maintains a catalogue of named atomic permissions (e.g., the right to invite a member, post in a forum, enrol a group in a journey, moderate a forum, delete a group). The catalogue is system-managed; new permissions can be introduced safely without breaking existing groups.

### 4.2 Role templates
The Hub ships a small set of role templates for engagement groups. Four are foundational:

- **Steward** — long-term group care: membership, settings, structure, oversight.
- **Guide** — journey facilitation: content expertise, progress tracking, feedback.
- **Member** — active participation: enrolling, completing activities, posting.
- **Observer** — supportive read-access: watching, perspective, view-only participation.

The split between Steward and Guide is deliberate: a group's caretaker is not always its subject-matter expert. One person may hold both roles in a small group; the system unions their permissions.

### 4.3 Custom roles
A Steward can define custom roles within their own group, drawn from the system permission catalogue. Custom roles do not require platform-level changes and do not bleed across groups.

### 4.4 Permission sets
Roles are composed of *permission sets* (named bundles), so the same permission can appear in multiple roles without duplication. Resolution is union-based; there is no override logic.

### 4.5 Two-tier permission scoping
The Hub resolves a member's effective permissions in any context as the additive union of:

- **System-group permissions** (always active), and
- **Context-group permissions** (active only in that group).

A member's "Guide" role in one group does not bleed into another group. A platform administrator's permissions are always active because they come through a system group, not a context group.

### 4.6 Permission resolution as a service
The Hub never trusts the client to determine permissions; permission decisions are produced by the platform and answered identically regardless of which client (web, mobile, admin tool) asks. The Hub asks; the platform answers.

### 4.7 Auto-grant for administrator role
When the platform's permission catalogue gains a new permission, the platform-administrator role automatically receives it, so the administrator role can never become silently underprivileged.

### 4.8 Last-administrator protection
The Hub prevents the last platform administrator from being removed (or removing themselves), because the administrator role is structural and cannot be allowed to vanish.

### 4.9 Act-as / context selector
The Hub lets a member who holds multiple roles or operates across multiple groups indicate which context they are currently working in. Permissions still resolve canonically in the platform; the selector is a UI affordance and does not weaken authority on the wire.

---

## 5. Group Lifecycle & Membership

The Hub treats group lifecycle with care because in a personal-development platform, joining and leaving have emotional and structural weight.

### 5.1 Group creation
Any FIM (subject to system-group permission) can create a new engagement group. The creator becomes its first Steward.

### 5.2 Member invitation — by user
A Steward can invite an existing FIM to the group. Invitation discovery includes a search affordance that filters by a user-visible identifier and excludes the inviter and current members.

### 5.3 Member invitation — by email (pending)
A Steward can also invite a person who is not yet a FIM by sending an invitation to their email address. The Hub stores the pending invitation and, when the invitee later signs up with that email, the pending invitation is automatically claimed and the member finds it on their invitations surface.

### 5.4 Invitation acceptance / decline
A FIM with a pending invitation can accept it (joining the group with the invited role) or decline it. Both actions are recorded; the invitation itself is preserved as history, not deleted.

### 5.5 Member status within a group
A group membership has its own status — at minimum: **active**, **invited** (pending acceptance), **paused** (temporarily inactive without leaving). Status changes are reversible while the membership exists.

### 5.6 Member roles within a group
A Steward can assign and remove roles within the group, including custom roles. Role changes take effect immediately and are reflected in subsequent permission decisions.

### 5.7 Member removal
A Steward can remove a member from the group. Removal preserves the member's authored content (forum posts, journey contributions) under the same preservation rules as voluntary leaving.

### 5.8 Voluntary leave — regular
A member who is not the sole Steward and not the last member can leave the group at any time. Their roles and membership are removed. Their authored content remains, attributed in a way that respects their absence (see 5.13).

### 5.9 Voluntary leave — sole-leader handover (administrator fallback)
When the only Steward leaves and no successor has been nominated, the platform administrator group inherits Stewardship of the group automatically — including pending invitations — so the group continues to be cared for. The original Steward then leaves under regular-leave rules.

### 5.10 Voluntary leave — nominated succession
The sole Steward can submit a *ranked list of nominees* drawn from active group members. The system invites nominees in order, one at a time, with a configurable response window per nominee. Acceptance transfers the Steward role and triggers a regular leave for the original Steward. Decline (or timeout) advances to the next nominee. Exhaustion of the list falls back to administrator inheritance (5.9).

### 5.11 Last-member closure
When the very last member of an engagement group leaves, the group's status becomes **closed**. The group's history is preserved. Any group-private content the group authored is reassigned to the platform administrator group so it does not become orphaned.

### 5.12 Administrator-initiated platform exit
A platform administrator can remove a member from the entire Hub in a single action. The administrator's exit sweeps every engagement group the member belongs to, auto-routing each through regular leave, sole-leader handover, or last-member closure as appropriate. Pending invitations are transferred. The member is decommissioned and force-logged-out. The action is recorded in an immutable audit log.

### 5.13 Authored-content preservation on exit
When a member leaves a group (or the platform), their authored content within that group is not deleted and not mutated. The Hub preserves the content and represents the absence at the display layer (e.g., showing a generic "former member" identity). If the member rejoins, their identity is restored automatically.

### 5.14 Group reactivation
A group that is closed or archived may be eligible for reactivation under administrator policy. The capability exists; the policy is configurable.

---

## 6. Journey Experience

A **journey** is the Hub's primary developmental experience — a sequence of authored steps that a member walks through alone or with a group. Journeys are the architectural linchpin of the Hub: communication is contextualised by journeys, discovery surfaces them, and intelligence accumulates insight from them.

### 6.1 Journey catalogue
The Hub provides a browsable catalogue of journeys. Visibility respects journey policy (public / private), member group memberships, and any access controls authored on the journey itself. Visitors see a public subset.

### 6.2 Journey detail
A member (or visitor) can view a journey's identity — its title, description, author, themes, indicative length, and any preconditions — before deciding to enrol.

### 6.3 Enrolment — individual
A FIM can enrol *themselves* in a journey. Enrolment uses the member's personal group as the enrolling entity (so the member's individual journey progress is conceptually owned by their personal group).

### 6.4 Enrolment — group
A FIM with the appropriate group-scoped permission (typically Steward or Guide) can enrol an *engagement group* in a journey. All active members of the group gain access to the journey's content under the group enrolment.

### 6.5 Enrolment uniqueness
The same group cannot enrol in the same journey more than once concurrently. Re-enrolment after completion or after exit is permitted under policy.

### 6.6 Journey Player
The Hub provides a step-by-step player for walking a journey:

- **Linear navigation** with previous/next.
- **Required-step gating**: required steps must be marked complete before progression continues.
- **Auto-saved progress**: every navigation and every interaction persists progress; the member can leave and resume at any time.
- **Resume to last position** on return.
- **Per-step time tracking** and a running total for the journey.
- **Completion detection**: when all required steps are complete, the enrolment is marked completed.
- **Review mode** for completed journeys: the member can revisit any step freely, with no gating.

### 6.7 Step types
The Hub supports a deliberately bounded library of step types. The foundational set covers:

- Narrative content.
- Open-ended reflection prompts (responses written privately into the member's accumulating profile).
- Structured self-assessment (validated frameworks).
- Choice / selection (member decisions that may shape the journey).
- Activity confirmation (member did something in the world and confirms).
- Journal entry attached to a journey moment (private by default).
- Checklist of small actions before proceeding.
- Embedded media (video, images, audio, embedded narrative blocks).

New step types are added intentionally, because every step type has implications for content, communication, discovery, and intelligence above it.

### 6.8 Onboarding journey
Every new FIM walks an onboarding journey automatically on first arrival. The onboarding journey is the Hub orienting itself to the member.

### 6.9 Frozen enrolment
When a group context disappears beneath an active enrolment (a member leaves a group, a group is closed), the affected enrolment is **frozen**, not deleted. A frozen enrolment is read-only: the member can revisit completed steps but cannot make new progress, mark new steps complete, or alter their state. The Hub presents the frozen state clearly so the member understands what has changed and why.

### 6.10 Public-journey portability
Enrolments in journeys whose access is universal (i.e., not group-private) are not affected by leaving a group. They belong to the member, not to the group context that originally hosted them.

### 6.11 Progress visibility within a group
Within an engagement group, role-appropriate members can view group-level progress and (where authorised) member-level progress. Members always see their own progress. Visibility of *others'* progress is permission-gated and never exposes private reflection content (see 10).

### 6.12 Journey transfer on group closure
When a group is closed and that group authored non-public journeys, those journeys are reassigned to the platform administrator group so they remain operable for any other groups already enrolled.

---

## 7. Communication

Communication in the Hub spans the three social dimensions: solo (private writing), one-to-one (direct messaging), and one-to-many (forums and announcements).

### 7.1 Direct messaging (1+1)
Any two FIMs can exchange private text messages. The Hub provides a conversation inbox, a per-conversation detail view, chronological message ordering, real-time delivery on the recipient's open clients, and per-conversation read state.

### 7.2 Forum (1+community)
Each engagement group has a forum. Posting, replying, viewing, and moderating are gated by group-scoped permissions (the four foundational roles all interact with the forum at different levels — Stewards moderate; Stewards, Guides, and Members post and reply; Observers view).

### 7.3 Authorship attribution
Forum posts and direct messages are authored by the member's *personal group*, not by the user account directly. This is what makes display-name changes propagate cleanly through history, and what makes "former member" handling possible without rewriting historical data.

### 7.4 Real-time delivery
Messages, forum activity, and notifications are delivered to open clients in real time. The Hub recovers gracefully when a client reconnects after being offline (no missed events).

### 7.5 Announcements (1→many)
A Steward can broadcast an announcement to their group. A platform administrator can broadcast an announcement platform-wide. Announcements are role-controlled and recorded for audit.

### 7.6 Activity feed
The Hub provides a lightweight activity feed that gives members a sense of a living platform — recent journey starts, group milestones, public reflections (only those the member has chosen to make public). The feed is ambient; it never surfaces private content.

### 7.7 Message and post lifecycle
Members can edit and delete their own posts and messages within a configurable window (and policy). After the window or after exit, content is preserved and presented under the absence rules in 5.13.

---

## 8. Notifications

The Hub treats notifications as the connective tissue between every other capability — they are how members find out something has happened, and increasingly how members *do* something in response.

### 8.1 Passive notifications
The Hub delivers passive notifications for events of interest: invitations, message arrivals, group-state changes, journey transitions, stewardship transfers, group closures, and similar. A passive notification informs; it does not require a response.

### 8.2 Smart (actionable) notifications
The Hub supports notifications that *carry an action*: the member responds directly from the notification surface (for example, accept or decline). Smart notifications:

- Carry a typed action payload.
- Have a configurable expiry window.
- Disable themselves once the action is taken or the expiry passes.
- Trigger downstream effects through a controlled, server-validated handler.

### 8.3 Real-time notification delivery
The Hub pushes new notifications to open clients in real time and updates an unread indicator. On reconnect, the Hub reconciles missed notifications.

### 8.4 Lazy expiry
Smart notifications that have expired without a response are auto-resolved on next view. The system does not depend on a continuously running timer to enforce expiry.

### 8.5 Notification history
Members can review past notifications and the actions they took on them. Notification history is preserved as part of the audit trail.

### 8.6 Notification preferences
Members can adjust how, where, and whether they are notified for each notification category — including external channels (email) where applicable. Defaults are conservative.

---

## 9. Companion Intelligence

The Hub provides each member with a sense of being *accompanied* — by a companion that asks questions, offers perspective, and never judges. This is grounded in two related concepts.

### 9.1 The Whisp
Each FIM has a **Whisp** — their personal future self. The Whisp is not an answer-giver; it is a perceptual lens. It accompanies the member across all three worlds. It has internal state (a sense of fullness, engagement-spectrum dimensions) that is private to the member unless the member chooses to expose it.

### 9.2 The AI Mentor
The Hub provides an opt-in conversational companion — the **AI Mentor** — which is the conversational expression of the Whisp's parallel-self mechanic. The Mentor:

- is opt-in per entry and globally — never imposed,
- responds in the platform's voice — warm, curious, non-prescriptive,
- offers questions or observations, never judgments or scores,
- never persists member data at the AI provider beyond what is required for a single response,
- can be reset or deleted by the member at any time,
- operates under explicit consent managed by the privacy capability cluster (10).

### 9.3 Insight accumulation
The Hub aggregates patterns from a member's journey engagement, reflections, and assessments into a coherent member portrait that the member can review. The portrait is *for the member*, not for the platform; it is private by default.

### 9.4 Companion presence in journeys
Journeys may invite the Mentor to participate in specific steps (e.g., a reflection step that benefits from a follow-up question). The member's opt-in state always overrides the invitation.

---

## 10. Privacy & Consent

Privacy in the Hub is architectural, not a feature. The principles in 1.3 mean that privacy capabilities precede commercial capabilities: the Hub will not provide a capability that requires breaching them.

### 10.1 Three tiers of visibility
The Hub recognises three tiers of visibility for member data:

- **Always private.** The Journal, Whisp internal state, reflection prompt responses, structured self-assessment results, free-form writing inside journeys. None of this is surfaced to anyone — including Stewards — without the member's explicit action.
- **Selectively shared.** Anything the member chooses to reveal, to whom, and when. Sharing is per-aspect, per-audience, per-timeframe, and revocable.
- **Public.** Display name, avatar, and anything the member has explicitly published.

### 10.2 Granular sharing controls
A member can share an aspect of their developmental data with a specific person (1+1), a specific group (1+community), or publicly — independently per aspect. Sharing is voluntary and can be revoked at any time, with revocation taking effect across the Hub.

### 10.3 Steward limits
A Steward cannot see a member's developmental data (reflections, assessments, journal entries) merely by virtue of being a Steward. A Steward sees what the member has chosen to share and what is by design observable (membership, role, activity surface).

### 10.4 No coerced disclosure
No journey, role, or interaction in the Hub may require the member to disclose private data as a precondition for participation. Disclosure prompts are always optional, and journeys must function meaningfully when the member declines.

### 10.5 Aggregate analysis safeguards
Aggregate data drawn from private journey content is not visible to other members. Anonymised aggregate data may be analysed only with explicit informed consent, responsible handling, clear member benefit, and platform stewardship oversight.

### 10.6 Consent state
The Hub records each member's consent decisions (data processing, AI participation, marketing communication, research participation, etc.) and exposes a single surface where the member can review and change them. Consent is *granular*: a member can consent to one channel and not another.

### 10.7 Data export
Each member can request, receive, and verify a complete export of their own data — every structured field, every authored item, every consent state. The export is human-reviewable.

### 10.8 Data deletion
A member's right to deletion is honoured at the platform level (decommissioning, hard-deletion under policy) with clear preservation of historical record (authored content reassigned, never silently mutated).

### 10.9 AI-provider boundaries
When the Hub uses an external AI provider, member data does not persist beyond the API call. The Hub does not allow training-on-member-data unless the member has explicitly opted in for that specific purpose.

---

## 11. Stewardship & Group Governance

Stewardship is the member-facing governance surface: how a Steward cares for a group day-to-day.

### 11.1 Member management
A Steward can invite, remove, pause, and activate members; assign and remove roles; and configure custom roles within their group.

### 11.2 Group configuration
A Steward owns the group's settings: name, description, visibility, member-list visibility, custom-role definitions, and any group-scoped policies.

### 11.3 Forum moderation
A Steward can moderate the group's forum: removing posts that violate group policy, addressing reports, communicating moderation decisions to the group as appropriate.

### 11.4 Journey enrolment for the group
A Steward (or Guide, depending on configuration) can enrol the group in journeys, freeze a group enrolment temporarily, or unenroll the group.

### 11.5 Visibility into group activity
A Steward sees structural information about the group — who is a member, who has which role, what journeys the group is enrolled in, group-level progress where authorised — without seeing members' private developmental data.

### 11.6 Stewardship handover
A Steward can initiate a handover (5.10), choose nominees, and let the platform manage the chain. The handover surface communicates progress and outcomes clearly.

### 11.7 Group closure
A Steward can close their group when its purpose is complete. Closure preserves history under the rules in 5.11.

---

## 12. Platform Administration

Platform administration is the system-level governance surface, owned by the platform administrator group. It is *part of the Hub* — administrators do their work through the Hub itself, not through a separate tool.

### 12.1 Platform stats and overview
Administrators have a dashboard summarising platform-level state: member counts, group counts, journey activity, system health surfaces.

### 12.2 Member management at platform level
Administrators can list members, search and filter, view a member's structural state (groups, roles, account state), and act on members through a defined set of administrative actions: activate, deactivate, decommission, hard-delete, force-logout, exit-from-platform, and administrative role changes.

### 12.3 Group management at platform level
Administrators can list groups, view group structure, intervene in group lifecycle when policy requires (suspending a group, archiving, reassigning Stewardship in case of abandonment), and access the audit trail of group-level decisions.

### 12.4 Permission catalogue management
Administrators (or a delegated subset) can extend the permission catalogue and adjust default role compositions. Changes to defaults do not silently mutate existing custom roles.

### 12.5 Audit log
The Hub records every administrative action — every status change, every role assignment by an admin, every platform exit, every catalogue change — in an immutable audit log that administrators can review.

### 12.6 Content moderation and reporting
Members can report content (a forum post, a message, a journey, a member); administrators triage reports through a structured surface; outcomes are recorded and communicated.

### 12.7 Bulk operations
Administrators can act on multiple subjects at once when the action is safe to batch (e.g., a bulk message, a bulk role adjustment in a defined group). Bulk operations are gated, confirmed, and audited.

### 12.8 Platform exit (administrator-initiated)
Per 5.12, administrators can sweep a member out of the platform in a single coherent action.

### 12.9 Policy and feature flags
Administrators can adjust platform-wide policy (defaults, expiry windows, system messaging) and toggle feature flags for staged rollouts. Changes are versioned and reversible.

---

## 13. Discovery

Discovery is how members find each other, find groups, and find journeys without being marketed to.

### 13.1 Public-content browsing
Visitors and members can browse public groups, public journeys, and public member surfaces. The browsing experience is calm — no growth-hacking patterns, no manipulative ranking.

### 13.2 Search
Members can search across discoverable surfaces (public journeys, public groups, members who have made themselves discoverable). Search respects privacy and visibility settings absolutely.

### 13.3 Recommendations
The Hub may surface recommendations for journeys, groups, and connections. Recommendations:

- are opt-in or clearly explained,
- never expose private data to the recommender or to the recommended,
- never use dark patterns to inflate engagement.

### 13.4 Member-discoverability
Each member chooses whether they appear in member-search results, and what about them is searchable. Default is conservative (limited discoverability).

---

## 14. Cross-cutting verticals

Five obligations cut across every other cluster. They are not separate features; they are *requirements* every capability must satisfy.

### 14.1 Administration & Moderation
Every capability that produces content or affects another member must be moderable and reportable. Every administrative intervention is audited.

### 14.2 Privacy & Consent
Every capability that touches member data must specify which tier of visibility (10.1) it produces and which consent (10.6) it depends on.

### 14.3 Notifications
Every capability whose state change could meaningfully affect a member must emit a notification (passive or smart) under the model in §8.

### 14.4 Observability
Every capability emits enough structured signal that platform health, member health, and policy outcomes can be understood without invading privacy. This includes audit, error tracking, and operational telemetry.

### 14.5 Transactions
Every capability that involves payment, subscription, or marketplace interaction passes through the Transactions vertical. The Hub itself does not handle payment primitives directly.

---

## 15. Felt experience

A capability foundation is not just a list of behaviours; it is also a list of *felt qualities* the Hub is responsible for producing. These are still capabilities, even when they cannot be unit-tested.

### 15.1 Three-Worlds-felt UI
The Hub's interface communicates which world the member currently inhabits. Transitions between worlds are felt — through colour, typography, ambient elements — not just navigated.

### 15.2 Loading and state-change clarity
The Hub never leaves the member uncertain about what is happening. Loading states are explicit. State changes after a data action are reflected immediately and consistently across all related surfaces.

### 15.3 Calm interaction patterns
The Hub uses calm interaction patterns: explicit confirmation modals for consequential actions (never browser-native dialogs), gentle progressive disclosure, no unsolicited interruptions, no autoplay.

### 15.4 Accessibility
The Hub meets a published accessibility standard. Every interactive surface is operable by keyboard alone, by assistive technologies, and across reasonable device sizes.

### 15.5 Internationalisation
The Hub is designed to be localisable. Every member-visible string has a localisation key; no string is hard-coded into a code path that cannot be reached by translators.

### 15.6 Performance as felt quality
The Hub responds to interactions in time-frames that preserve a sense of continuity. Pagination, search, and bulk views are responsive even at scale; loading skeletons preserve layout to avoid disorientation.

---

## 16. Boundaries — what the Hub deliberately does *not* do

Drawing the boundary is itself a capability decision. Each item below is a non-capability that is enforced architecturally.

- **Authoring tools.** Journey authoring, narrative-arc authoring, universe authoring, and similar live in dedicated *Studios*, not in the Hub.
- **Native mobile capabilities.** Anything that depends on device capabilities (GPS, camera, AR, deep push notifications) lives in a separate mobile companion product.
- **Direct database access.** The Hub never reaches into the platform's data store directly; every domain operation passes through a contracted API.
- **Permission logic.** The Hub asks the platform; it does not decide.
- **Payments.** Payment, subscription, and marketplace transactions belong to the Transactions vertical, not to the Hub.
- **Explicit developmental frameworks.** The Hub does not surface developmental theories or models in its primary UI. Development is implicit, by design.
- **Under-18 service.** The Hub does not serve users under 18.

---

## 17. Glossary (briefing-style)

- **FIM** — FringeIsland Member; an account holder, 18+.
- **Personal group** — the per-member identity group, with the member as its sole member.
- **Engagement group** — a user-created social container.
- **System group** — a platform-level group whose permissions are always active (Visitor, Member baseline, Platform Administrator).
- **Steward / Guide / Member / Observer** — the four foundational engagement-group roles.
- **Universal Group Pattern** — the architectural decision that every access-bearing entity is a group.
- **Two-tier permission scoping** — the rule that effective permissions are the union of system-group permissions and context-group permissions.
- **Frozen enrolment** — read-only enrolment state when a group context disappears.
- **Smart notification** — a notification carrying a typed, expiring action.
- **Whisp** — each member's personal future self; a perceptual lens.
- **AI Mentor** — the opt-in conversational expression of the Whisp.
- **Three Worlds** — Ordinary World, Safe Harbour, The Other Side.
- **Verticals** — the five cross-cutting obligations (Administration, Privacy, Notifications, Observability, Transactions).

---

## Use of this document

This document is the **authoritative capability map** for new feature work on the Hub. A feature specification must:

1. State which capability or capabilities (by section number) it serves.
2. State which verticals (14.1–14.5) it must satisfy and how.
3. Make explicit any capability *gap* it surfaces — capabilities listed here but not yet served, or capabilities not listed here but implied by the feature's design (which means this document needs to be amended before the feature ships).

This document is **versioned**. Any change to a capability's meaning is a versioned change, with a corresponding migration note for downstream feature specs.

This document is **descriptive of intent**, not of release timing. Whether and when each capability is delivered is a release-planning concern, not a capability concern.
