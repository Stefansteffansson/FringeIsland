# The Hub, in plain English

**Purpose.** This file is a long-form, plain-English description of how the Hub works — the full web system, present and intended. It is briefing material for a sister Claude conversation where capabilities will be documented and defined. It paints the whole picture: what the Hub *does today*, what it is *designed to do* as the platform matures, and the underlying logic that holds the two together.

It is not a spec. It is an oriented walk through the system, written so that anyone — human or AI — who reads it can hold the Hub in their head as one coherent thing.

---

## 1. What FringeIsland is, and what the Hub is inside it

FringeIsland is an ecosystem built around three questions: **Who am I? What do I want? How do I get there?** It does not answer them. It holds them — gives them space, structure, and companionship — so each member can find their own answers.

The ecosystem is described through the metaphor of three worlds:

- **The Ordinary World** — life outside the platform. Always present, never absent. The departure point.
- **The Safe Harbour** — FringeIsland itself. A place of reflection, sharing, and becoming. Safe, but not comfortable.
- **The Other Side** — deeper water, where narrative, challenge, and transformation live. Not a distant place but an intimate one — each member carries their own Other Side.

The **Hub** is the browser-based product through which a member experiences FringeIsland. It is the Safe Harbour made tangible. The Hub is *where you land*. It is not where you author content (that lives in the Studios), nor where you play the game (that's the Game), nor where you carry the platform on you (that's the Gimbal, the planned mobile companion). The Hub is the home page of the harbour: a calm, oriented place where members arrive, manage their identity, belong to groups, and walk through structured developmental experiences called **journeys**.

Using the Hub is meant to feel like arriving at a real harbour. You can see who's here. You know where things are. You can choose where to go next — a journey, a conversation, your own quiet — without being pushed. The interface is **calm, not gamified**. Progress is visible but not competitive. The emotional register is, in the project's own words, *safe, oriented, purposeful*.

---

## 2. The people who show up

The Hub welcomes a few distinct kinds of people.

**Visitors** are anyone who hasn't signed up yet. They can browse, read, peek into journeys, even *try* one — without an account. The platform creates an anonymous Supabase session for them on first visit and stores their tentative steps against a temporary identity. The transition from visitor to full member is a *soft threshold, not a wall*: when they sign up, the anonymous account is converted into a real one, the proto-personal-group becomes their real personal group, and nothing they did is lost. The garden door simply opens.

**FIMs — FringeIsland Members** — are anyone 18 or older with an account. (Under-18s are out of scope for legal reasons.) FIMs are the population of the harbour. Within that population, the project recognises three behavioural archetypes — patterns of inhabitation, not market segments:

- **The Homebody** finds depth in solo reflection. Returns again and again to their own garden.
- **The Explorer** dives in, follows the story, looks for connection. Is hungry for the Other Side.
- **The Dreamineer** is a creator and contributor — coaches, educators, creative professionals — who want to *make* journeys, seasons, and worlds for others.

A single member can move between archetypes, or hold more than one at once. The Hub serves all three: solo work for the Homebody, narrative and connection for the Explorer, contribution surfaces for the Dreamineer. (Dreamineers' authoring tools live in the Studios, but the Hub is still their home as members and as participants in the contributor community.)

Within any group, FIMs hold one of four **roles**. These are crucial because the Hub's whole permission system rotates around them:

- **Steward** — *cares for the house*. Long-term group care: membership, settings, structure, oversight. Stewards invite, remove, pause, activate, assign roles, set group visibility, and decide whether the member list is public.
- **Guide** — *knows the path*. Journey facilitation: content expertise, progress tracking, feedback. Guides facilitate the learning, but they do not run the group.
- **Member** — *walks the path*. Active participation: enrolling, completing activities, posting, replying.
- **Observer** — *a companion on the sideline*. Supportive follow-along: watching, perspective, quiet feedback. Observer is not passive surveillance — it is read-access with view-only participation, designed for external mentors, peer reviewers from another group, or coaches checking in.

The split between Steward and Guide is deliberate. A group's caretaker is not always its subject-matter expert. In small groups one person can hold both, and the system simply unions their permissions.

Above all of these sits **DeusEx** — the platform administrators. DeusEx is *itself a group* (the universal pattern again — see §5), with all 42 platform permissions. The first DeusEx member is bootstrapped (`deusex@fringeisland.com`); after that, DeusEx members add and remove each other, with last-member protection so that the role can never accidentally vanish.

---

## 3. Arriving, and becoming someone

When a visitor lands on the Hub, an anonymous session is created immediately and silently. Everything they touch — taster journeys, choices, glimpses of their garden — is saved to a *proto-profile*. If they never come back, a scheduled job eventually cleans them up. If they do return and decide to stay, signing up flips the temporary flag and converts the proto-profile into a permanent one. Their work follows them.

A new member gets three things at once:

1. A **user record** with full name, avatar, and a flexible bag of dynamic profile data (`profile_data`) — a separate table that grows as the member accumulates assessments, reflections, insights, and intentions through journeys.
2. A **personal group** auto-created just for them, with exactly one member: themselves. This personal group is their identity. Its name is the member's chosen alias — the **display name** — which is what other people see when the member posts in a forum, sends a message, or appears in a member list. The user can use their real name if they want. They can use a nickname. They can change it later. This is a privacy decision dressed as a feature: a personal-development platform that asks vulnerable questions has to let people choose how they appear.
3. A **system membership** in the *FringeIsland Members* group, which carries the platform-wide capabilities every authenticated FIM enjoys: create engagement groups, browse the catalogue, enrol in journeys, send messages.

Beneath all of this, in the Hub's domain layer, lives a **personal Journal** — a private writing surface attached to the member, never shared, never derived-from. (More on privacy in §11.)

---

## 4. Groups, and why everything is a group

The single most important pattern in the system is what the team calls the **Universal Group Pattern**, or D15. It says: *everything that touches access is a group*. People are represented by their personal group. When a person joins an engagement group, what actually happens is that their personal group joins it. When an engagement group needs to be a member of another engagement group — a sub-team inside a larger organisation, say — that is also just one group joining another. The system has no special case for "user," "team," or "organisation." It has groups, and groups have members, and members are themselves groups.

Three flavours of group exist:

- **System groups** are platform-level. They are the *Visitor* group (implicit, for anonymous browsing), the *FringeIsland Members* group (which everyone joins automatically on signup), and the *DeusEx* group (manually granted superuser access). Their permissions are always active, regardless of where in the Hub the member is currently working.
- **Personal groups** are the per-member identity groups described above. They exist to serve as the bridge between a person and the rest of the world.
- **Engagement groups** are user-created. They are the book circles, communities of practice, guide networks, classes, retreat cohorts, organisational units. They are where the social life of the platform actually happens. Every engagement group has a status — *active, closed, archived,* or *suspended* — and a visibility (public or private). Stewards can also independently decide whether the *member list* is visible, separate from group visibility itself.

When one group joins another, the host group assigns *roles* to the joining group. Membership is **transitive**: if Group Alpha joins Beta, and a member's personal group has joined Alpha, the member can reach Beta through the chain, with whatever role Beta assigned to Alpha. Default depth is unlimited; a configurable safety valve exists for when (or if) chains get long enough to slow things down. There is a circularity guard at insert time, so loops cannot form.

This sounds abstract, but it produces something elegant in practice: visitors, regular members, group leaders, and superusers all flow through *the same permission machinery*. There are no special branches in the code for "is this user an admin" — DeusEx is just a group whose role grants every permission, and the same `has_permission()` call resolves it.

---

## 5. How permissions actually resolve

The Hub uses **dynamic, role-based access control**. The model has three layers:

- **Permissions** — about 42 named capabilities, seeded into the database. These are atomic things like `invite_members`, `post_forum_messages`, `enroll_group_in_journey`, `view_member_profiles`, `moderate_forum`, `delete_group`. The full catalogue is system-managed; new permissions can be added in code, and a database trigger automatically grants any newly-introduced permission to the DeusEx role.
- **Roles** — bundles of permissions. Four engagement-group role templates ship by default: Steward, Guide, Member, Observer (described in §2). Stewards of a group can also create custom roles for their own group, drawn from the system permission catalogue. So one community might want a "Mentor" role; another might want a "Note-taker" role. The platform supports this without code changes.
- **Permission Sets** — named bundles of permissions that roles can include. The same permission can appear in multiple sets, so the model deals in unions, not overrides.

When the Hub asks "is this person allowed to do X *here*?", two scopes contribute:

- **System group permissions** (always active). FringeIsland Members get the platform baselines. DeusEx gets everything. Visitors get a bare-bones set: browse public catalogue, sign up, sign in.
- **Context group permissions** (active only when working in that group). A user's "Guide" role in Group #42 doesn't bleed into Group #99; it lives where it lives.

The user's effective permissions in any given context are the *additive union* of system permissions and the relevant context-group permissions. There is no priority logic, no "admin overrides member" — just additive layering, which is one of the reasons the system is simple to reason about.

The Hub never resolves permissions client-side as the source of truth. Every check goes through `has_permission()` in the database (a `SECURITY DEFINER`, `STABLE` function) so that the same answer is given whether the request comes from the web UI, an API call, a future mobile app, or an admin tool.

---

## 6. Journeys — what people actually *do*

If groups are the social skeleton of the Hub, **journeys** are the muscle and nerve. A journey is a structured developmental experience: a sequence of steps, authored by a Dreamineer (in Journey Studio), browsed in the Hub catalogue, and walked through inside a thing called the **JourneyPlayer**.

**Browsing.** Visitors see a public catalogue. FIMs see published journeys, with public ones plus any private ones they have access to via group membership. There is a notion of a "FringeIsland Journeys" engagement group that owns the eight predefined platform-authored journeys — public, free for anyone to take.

**Enrolment.** A journey can be entered in two ways:

- **As an individual** — the member's personal group is enrolled. This is the Homebody mode: a private, solo walk.
- **As a group** — a Steward or Guide enrols an engagement group, and every active member of that group has access. This is the Explorer or community mode: shared progress, shared milestones, shared forum threads tied to that journey.

In both cases, the database records *enrolled-by-group* and *enrolled-group*, never a `user_id` column — the Universal Group Pattern is rigorous about this. Even a solo enrolment is "the member's personal group enrolled in this journey."

**The JourneyPlayer.** Once enrolled, the member opens the journey at `/journeys/[id]/play`. The player renders the journey step-by-step with a sidebar of all steps and a content area for the current step. Navigation is linear (Previous/Next), but with two important rules: required steps gate the Next button until completed, and progress autosaves to a JSONB blob on every navigation. Resume is automatic — the system knows your last position. Each step records its own `completed_at` and time-spent metric, plus a running total.

**Step types.** The journey is built from a small library of content units. Tier-1 (the Ferd core): *Narrative* (rich text, no profile data written), *Reflection prompt* (open-ended free-form response, written privately to `profile_data`), *Structured self-assessment* (validated frameworks like Big 5 or VIA — core profile data), *Choice/selection* (member picks an option, can shape direction), *Activity confirmation* (member does something in the real world and confirms), *Journal entry* (free writing attached to a journey moment, private by default), and *Checklist* (small actions before proceeding). Tier-2 (early Ferd): *Video*, embedded media, and richer narrative blocks. The set is intentionally bounded; new types are added carefully, because every new type has implications for content, communication, discovery, and intelligence above it.

**Completion and review.** When all required steps in a journey are done, the enrolment status flips to `completed`. The member can return at any time in *review mode*, which removes the gating and lets them wander freely through the steps they took.

**Journey Zero** is the onboarding journey — the first journey every new member walks automatically. It is the orientation moment: the harbour explaining itself.

**Freezing.** When a member leaves a group, their group-private journey enrolments don't disappear — they *freeze*. The JourneyPlayer detects a frozen enrolment and goes read-only: an amber banner explains the state, the "Mark Complete" button hides, navigation is restricted to already-completed steps, and the database refuses any progress writes. Public journey enrolments (the eight platform ones) are not affected — they belong to the member, not the group. If a group is closed entirely (its last member leaves), *all* its enrolments freeze, and any non-public journeys the group authored are transferred to DeusEx for safekeeping. Nothing is destroyed; it is preserved, frozen, recoverable.

---

## 7. Communication — how people connect

Three communication surfaces live in the Hub.

**Direct messaging** is one-to-one text. A member opens `/messages` to see their inbox of conversations, opens a conversation to see the full chronological history, types a reply, and sends. New messages arrive in real time via Supabase Realtime; an unread badge sits in the top navigation; per-conversation read state is tracked. This is the *1+1* surface.

**Group forums** are scoped to engagement groups. Stewards, Guides, and Members can post; Observers can view but not post; Stewards can moderate. The author of a post is recorded as the *personal group* of the writer (`author_group_id`), not the user, which is again the Universal Group Pattern at work. This is what makes display-name changes propagate cleanly through forum history. When a member leaves a group, their forum posts are not deleted and not mutated — they simply display as "Former Member" until and unless that person rejoins. This is the *1+community* surface.

**Notifications** are the connective tissue between everything. Two flavours coexist. **Passive notifications** announce events — a new message, an invitation, a stewardship transfer, a group closure — and are delivered via Supabase Realtime with a REST fallback on reconnect. **Smart notifications** carry an `action_type` (e.g., `accept_decline`), an `action_data` payload, and an `expires_at`; the NotificationBell renders Accept/Decline buttons, and the user's choice is dispatched through a dedicated RPC that performs the side effects. This is how stewardship nominations work end-to-end (see §8). Expiry is handled lazily client-side: when any user views their notifications, expired actionable notifications are auto-declined and the next consequence is set in motion.

Above all of this, in design intent, will sit **announcements** (one-to-many, role-controlled — Stewards announce to their group, DeusEx announces platform-wide) and an **activity feed** (lightweight ambient awareness, the sense of a living platform). These are part of the Communication domain service and are slated for later waves.

---

## 8. Leaving — the lifecycle of exit

A great deal of design care has gone into what happens when someone leaves, because in a personal-development platform, leaving has emotional and structural weight. Four tracks (L1 to L4) cover it, plus an admin escape hatch.

**L1 — Regular leave.** A member who is not the sole Steward and not the last person in the group can simply leave. Their roles are deleted, their membership row is removed, their group-private journey enrolments are frozen with `frozen_reason='left_group'`. Public journey enrolments are untouched. Their forum posts remain, displayed as "Former Member."

**L2 — Sole-Steward handover (DeusEx fallback).** If the only Steward of a group wants to leave and no nominee is in play, DeusEx steps in: gets membership and the Steward role in the group, takes over any pending invitations, and only then is the original Steward removed. The group continues; care is preserved.

**L3 — Last-member group closure.** If the very last person in a group leaves, the group's status flips to `closed`. Every active enrolment is frozen. Any non-public journeys the group authored are reassigned to DeusEx so they aren't orphaned. The group's history is preserved, not deleted.

**L4 — Stewardship nomination.** This is the gentle, member-driven version of L2. The sole Steward submits a *ranked list of nominees* — active members of the group. The system sends a smart notification to nominee #1 with a 7-day expiry: *"You've been nominated as Steward of [Group]. Accept or Decline?"* If they accept, they get the Steward role, the original Steward exits via L1, and the group is told. If they decline (or time out), nominee #2 is notified, and so on. If the entire chain runs out, L2 (DeusEx fallback) takes over and DeusEx becomes the notified party.

**Admin platform exit.** An admin selects a user, clicks "Exit Platform," confirms, and a single RPC sweeps the user across every engagement group they belong to, auto-routing each one through L1, L2, or L3 as appropriate. Pending invitations are transferred. The user is decommissioned (`is_decommissioned = true`, `is_active = false`), all auth sessions and refresh tokens are deleted, and the action is recorded in an immutable audit log.

Throughout, the rule is: **preserve, don't destroy**. Nothing about this is final-as-deletion. Decommissioning is a flag, hard-deletion is a separate explicit admin action, and even hard-deletion reassigns content to a `[Deleted User]` sentinel rather than corrupting the historical record.

---

## 9. The Whisp and the AI Mentor — companions, not oracles

Two related concepts give the Hub its felt sense of *being accompanied*.

**The Whisp** is each FIM's personal future self. Not an answer-giver but a *perceptual lens* — operating across all three worlds as companion voice, perceptual richness, and active instrument. The Whisp grows with the member; it has its own internal state (fullness, void dimensions) that is private to the member unless they choose to expose it. In Ferd, the Whisp is structurally provisioned (data model, privacy controls, profile_data linkage). The first narrative expression — the first *encounter* — is scoped for the next wave (Eid). Deeper expressions, including in-world embodiment, arrive across later waves.

**The AI Mentor** is the conversational form of this companionship. It is not an external coach; it is the member's *parallel self*, a companion from a universe where they never found the answers either. It asks genuine questions born from its own incompleteness, and accidentally asks exactly what the member needs to hear. The Mentor:

- is opt-in per entry or as a global setting — never imposed,
- speaks in FringeIsland's voice — warm, curious, non-prescriptive,
- offers questions or observations, never judgments or scores,
- never lets member data persist beyond the API call at the AI provider,
- can be reset or deleted at any time by the member,
- is consent-managed through the Privacy vertical.

In Ferd, the foundation is built (privacy controls, consent model, context storage in `profile_data`). The full Whisp/Mentor expression unfolds across post-Ferd waves — the platform keeps its promise to never imposing AI on a member who hasn't asked for it.

---

## 10. The Three Worlds, felt through the UI

The Hub's interface is itself a **narrative device**. As the member moves between Ordinary World content (their dashboard, their settings, their groups list), the Safe Harbour proper (most of the application — the harbour quality of being held), and the Other Side (deeper journeys, narrative episodes), the UI is meant to *feel different*. Colour, typography, ambient elements, and emotional register shift. Transitions are felt, not just navigated.

This is one of the reasons the Hub insists on being *calm, not gamified*. A points-and-leaderboards aesthetic would collapse the Three Worlds into one flat sales surface. Instead, the harbour has a soft, oriented quality — the user can *see* where they are and *feel* where they're going. Progress is visible (you can see how far through a journey you are) but not competitive (no leaderboards, no "X% completed faster than you"). Group membership is the primary social container; through groups you encounter journeys, forums, and each other. Solo, relational, and collective dimensions of growth all have their own surfaces, and none is treated as the "real" mode.

The full Three-Worlds UI design — the felt transitions — lands in the **Urd** wave. The earlier waves build the substance; Urd builds the felt language.

---

## 11. Privacy as architecture, not feature

The Hub treats privacy as a structural commitment rather than a checkbox. Member data has three tiers of visibility:

- **Always private.** The Journal. The Whisp's internal state. Reflection prompt responses. Structured self-assessment results. Free-form writing inside journeys. None of this is ever surfaced to anyone — including Stewards — without the member's explicit action.
- **Selectively shared.** The member chooses what to reveal, to whom, and when. Sharing can be 1+1 (with a specific person), 1+community (with a specific group), aspect-by-aspect (you can share your garden without sharing your journal, share assessment results with one person but not another), and **revocable** (what was shared can be unshared).
- **Public.** Display name. Avatar. Public garden if the member opts in. Public journey activity *if* the member explicitly publishes it.

Stewards do not see members' developmental data. Aggregate analytics across private journeys are not available to other FIMs. Anonymised aggregate research data may be explored, but only with explicit informed consent, responsible handling, clear member benefit, and Foundation/Council stewardship. Sharing is voluntary, not coerced; the member controls revelation.

The non-negotiable principle behind this is: **privacy over commercial opportunity**. Member data serves the member, not the platform.

---

## 12. Under the hood — how the Hub is actually wired

The Hub is, technically, a Next.js 16 App Router web application written in TypeScript, styled with Tailwind, sitting on top of Supabase (PostgreSQL + Auth + Realtime). But the architectural shape that matters most is this: **the Hub is a *consumer* of the platform, not the platform itself**.

The system is split into three tiers:

```
              ┌────────────────────────────────────────┐
              │     Products + Studios (consumers)     │  ← The Hub lives here
              └──────────────────┬─────────────────────┘
                       Platform API (contract)
              ┌──────────────────┴─────────────────────┐
              │           Platform Domain (PD)         │
              │   World Model · Narrative Engine ·     │
              │   Experience Engine · Content ·        │
              │   Communication · Discovery ·          │
              │   Intelligence · Extension System      │
              └──────────────────┬─────────────────────┘
                      Internal API (contract)
              ┌──────────────────┴─────────────────────┐
              │            Platform Core (PC)          │
              │   Infrastructure · Identity ·          │
              │   Organisation · Governance            │
              └────────────────────────────────────────┘
```

**Platform Core** is the four domain-agnostic foundations: Infrastructure (hosting, observability substrate, the transactional database), Identity (authentication, profiles, sessions, the personal Journal), Organisation (groups, memberships, role assignment, permission resolution), and Governance (audit log, content reporting, GDPR consent, data export, feature flags).

**Platform Domain** is the seven FringeIsland-specific services: World Model (the universe, the Three Worlds, the Whisp, lore), Narrative Engine (seasons, episodes, story beats), Experience Engine (journeys, steps, progress, enrolments — the architectural linchpin of the system), Content (media, assets, narrative blocks), Communication (DM, forums, activity feeds), Discovery (search, recommendations, marketplace), and Intelligence (the AI Mentor, profile accumulation, insights). The eighth piece is the Extension System — the meta-module that lets the platform grow in extensible ways.

The Hub speaks to Platform Domain via the **Platform API**, never by reaching into the database directly. This is **ADR-U009: API-first, frontend-agnostic** — every feature is built as if iOS and Android already exist. The shape is always *Database → API route → Frontend component*, never *Database → Frontend component*. This is what makes the Gimbal (the planned mobile companion) and the Game (the planned three-realm runtime in Unreal Engine) able to share the same domain logic without re-implementing it.

Underneath this, the Hub satisfies all five **cross-cutting verticals** — obligations every product, service, and component must fulfil:

- **Administration** — moderation, content reporting, admin actions.
- **Privacy** — GDPR compliance, AI consent, data export.
- **Notifications** — passive and smart, real-time and stored.
- **Observability** — audit, errors, telemetry.
- **Transactions** — Stripe, payment, subscription, marketplace flows.

The verticals are not services with code; they are *obligations*. Every feature spec carries a Vertical Impact section that says how it satisfies each one.

The Hub's own UI conventions are deliberately spare: **never** browser `alert()` or `confirm()` — always a `ConfirmModal`. **Always** show loading states. After any data change, update *all* related state together. The interface is allowed to be still and quiet; it is not allowed to be jumpy or surprising.

---

## 13. What's live today, and what unfolds

The Hub is a moving system. The current development focus is the **Ferd** wave, the foundational floor: identity, groups, journeys, communication, notifications, RBAC, admin. Most of what is described in §3 through §8 is implemented and shipped today, with retroactive feature specifications now being written to capture it as a `6-done` Hub feature (`FEAT-H*`) inventory.

The waves that follow expand the surface area:

- **Eid** — *flow, emergence*. The first narrative expression of the Whisp encounter. Richer journey types. Discovery surfaces.
- **Hamn** — *the harbour fully felt*. Stewardship tools deepen. Group-of-groups patterns get organisational chrome.
- **Heim** — *belonging, home*. The Dreamineer contributor experience matures; cross-ecosystem participation gets first-class surfaces in the Hub.
- **Brim** — *edge, threshold*. The Marketplace appears. Transactions vertical takes a real seat at the table. Endowment economics begin.
- **Urd** — *fate, origin, what has become*. The Three-Worlds UI lands as a felt experience. Seasons and Episodes mechanics arrive. NPC behaviour authoring opens. Advanced analytics. The Endowment fully expressed. And, eventually, the Game itself — Unreal-Engine three-realm runtime — released to the Other Side, with VR/AR distribution beyond.

Across these waves, the Hub stays the Hub: the calm, web-based Safe Harbour, the place you arrive. What grows around it is depth, not surface area.

---

## 14. What the Hub *will not* do

It is just as important to say what the Hub is not, because confusion here would make the capability map sprawl.

The Hub does not:

- provide journey authoring, deployment, or lifecycle management — those are **Studios** (Journey Studio, Arc Studio).
- provide world-building or universe management tools — that is **Universe Studio**.
- offer native mobile experiences requiring device capabilities like GPS, camera, AR — that is **The Gimbal**.
- access the database directly — every domain operation goes through the Platform API.
- implement its own permission logic — Platform Core (Organisation) resolves permissions; the Hub just asks.
- handle payments, subscriptions, or marketplace transactions itself — the Transactions vertical does that.
- surface developmental frameworks or theories explicitly — development is *implicit*, per the Vision. Stories are entertainment first; learning emerges.
- serve users under 18.

These are not limitations; they are *boundaries that keep the Hub the Hub*. Each is enforced at the architectural level so that growth in the ecosystem expands the right surfaces, not the wrong ones.

---

## 15. The promise the Hub keeps

When the Hub is doing its job, a member should feel these things, in roughly this order:

- **I am welcomed.** The harbour has space for me. I can be here without committing.
- **I know where I am.** Navigation is calm. The map is legible. I am not being sold to.
- **I have a place that is mine.** My personal group is my home. My journal is private. My display name is my own choice.
- **I belong to people.** Groups, journeys, conversations — the social fabric is *real*, not gamified, and not coercive.
- **I am being asked good questions.** The journeys provoke; they don't lecture. The Whisp accompanies; it does not direct.
- **My data serves me.** Privacy is not a settings page I have to remember to check. It is the architecture.
- **I can leave gracefully.** When I want to step away — from a group, from the platform — there is a path that preserves what should be preserved and dissolves what should dissolve, without drama.

This is the Hub. It is the harbour where the questions *Who am I? What do I want? How do I get there?* are held — given space, structure, and companionship — and never answered for you.

---

## Appendix: a glossary, since this is briefing material

- **FIM** — FringeIsland Member. Anyone 18+ with an account.
- **Personal group** — the per-FIM identity group, with exactly one member (themselves). Their public name is the group name (display name).
- **Engagement group** — user-created groups (book circles, classes, communities of practice). Where social life happens.
- **System group** — Visitor, FringeIsland Members, DeusEx. Always-active permissions.
- **Steward / Guide / Member / Observer** — the four engagement-group roles.
- **DeusEx** — the platform admin group. Itself a group, like everything else.
- **Universal Group Pattern (D15)** — the rule that everything access-related is a group; people are represented by their personal group.
- **Two-tier permission scoping** — system-group permissions are always active; context-group permissions are active only inside that group. Effective permissions are the additive union.
- **Journey** — a structured developmental experience, sequence of steps, walked in the JourneyPlayer.
- **Journey Zero** — the onboarding journey, walked automatically by every new member.
- **Frozen enrolment** — read-only enrolment state when a group context disappears (member left, group closed). Preserves history.
- **Smart notification** — an actionable notification with `action_type`, `action_data`, `expires_at`; renders as Accept/Decline in the bell.
- **L1 / L2 / L3 / L4** — the four group-exit tracks (regular leave, sole-Steward DeusEx handover, last-member closure, nomination).
- **The Whisp** — each FIM's personal future self. Companion voice across the three worlds.
- **AI Mentor** — the opt-in conversational expression of the parallel self.
- **Three Worlds** — Ordinary World, Safe Harbour, The Other Side. The cosmological frame; eventually felt through the UI.
- **profile_data** — the flexible accumulation table where assessments, reflections, insights, and intentions live.
- **Platform Core (PC)** — Infrastructure, Identity, Organisation, Governance.
- **Platform Domain (PD)** — World Model, Narrative Engine, Experience Engine, Content, Communication, Discovery, Intelligence (+ Extension System).
- **The five verticals** — Administration, Privacy, Notifications, Observability, Transactions. Cross-cutting obligations every product satisfies.
- **Wave** — the project's planning unit. Six waves: Ferd → Eid → Hamn → Heim → Brim → Urd. Thematic focus buckets, not sequential gates.

---

*Generated from the project's vision, manifesto, universe design, architecture anatomy, Hub product specification, platform overviews, verticals, and the implemented Ferd feature documents under `docs/TMP/OLDFEAT/`. This file is briefing material — the source documents remain canonical for any specific point.*
