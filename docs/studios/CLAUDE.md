# CLAUDE.md — Studios tier

**Applies to:** anything under `docs/studios/` and the corresponding code (authoring interfaces, content-management surfaces, deployment and retirement flows for Dreamineer-created content).
**Load order:** root [`CLAUDE.md`](../../CLAUDE.md) → [`AGENTS.md`](../../AGENTS.md) → [`PROCESS.md`](../planning/PROCESS.md) → the skill matching the task → **this file** → the studio's `README.md` → the feature spec.
**Reads as a delta.** Assumes root `CLAUDE.md` is already loaded. Contains only what's specific to studio-tier work.

---

## What makes this tier different

Studios are a **role-gated authoring mode inside the one experience, not products** ([ADR-U026](../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md)). A studio serves the FIM in their authorial stance — a **Dreamineer** specialisation — and entering one is a permission check against the platform's own group/role mechanism (ADR-U006, ADR-U007). The gates, per the [roles core](../ecosystem/universe/roles/README.md):

| Dreamineer specialisation | Studio |
|---|---|
| Creator + Anthropologist | World Studio |
| Teller | Arc Studio |
| Wayfinder | Journey Studio |

World Studio access additionally tiers by **scope**: the personal-scope slice (furnishing your own home) is open to every FIM; shared-world authoring is Dreamineer-gated. Dreamineers design, deploy, manage, and retire the world, stories, and journeys the rest of FringeIsland experiences. Everything about a Studio is shaped by that fact: different permissions, different review processes, different UI conventions than the product shells use.

Studios are **full lifecycle** environments, not just authoring tools. A Studio feature that handles authoring but leaves deployment, management, or retirement unspecified is incomplete by design. "Design → deploy → manage → retire" is the cycle every Studio capability must account for. Content that goes in must also be able to come out — deprecation, archival, takeover, and retirement are first-class concerns, not afterthoughts.

**Universe Studio is the parent entity** (ADR-U026): the umbrella over the three studios AND the **binding frame** — coherence across worldbuilding, narrative, and journeys is held at its level. The tree nests to match: `universe-studio/{world-studio/, arc-studio/, journey-studio/}`. Each sub-studio **writes to exactly one Domain Service**: World Studio → World Model (DS-1), Arc Studio → Narrative (DS-2), Journey Studio → Journeys (DS-3). This is a hard constraint, not a guideline. A Studio feature that wants to write to a second Domain Service is a sign the feature belongs in a different Studio (or that a new Studio is needed). Journey Studio and the Universe Studio umbrella are scoped from **Eid** onward; Arc Studio is **Urd**-wave and not in active development before then.

---

## Verticals: obligations on this tier

The five verticals (ADR-U002) are obligations on every tier. Here's what each requires specifically when you're working at the studios tier. Every feature spec's Vertical Impact section must address all five — address each or mark "None" with rationale (AGENTS.md, always-do).

- **Administration** — Dreamineer actions on their own content (pause, revise, retire, hand over) are self-service. Admin primitives still route through Platform Core, but the Studio surface owns the lifecycle UX. DeusEx can force-archive or takeover creator content only in defined circumstances (abandonment, policy violation) — those flows are separate from normal creator management and need explicit design in the feature spec.
- **Privacy / GDPR** — Content metadata (who created what, when, with what audience) respects creator privacy settings the same way FIM data does. Attribution visibility is creator-controlled: a Dreamineer can publish pseudonymously, anonymously, or under their public identity. Studios never leak creator real names through metadata, authorship chains, or collaboration records unless the creator opted in.
- **Notifications** — Studios emit notifications to both creators (about their content: new enrolments, feedback, retirement warnings, policy issues) and to consumers downstream when relevant (a retired journey's enrolled FIMs get notified through the product, not the Studio). The Studio's job is emitting the trigger accurately; routing is owned by Communication.
- **Observability** — Content lifecycle events are first-class observability: publish, update, deprecate, retire, handover, takeover. Creator actions on their own content are tracked separately from FIM interactions with that content — the two audit trails must not mingle. Studio errors (a save that silently failed, a deployment that didn't propagate) are Dreamineer-visible failures; don't swallow them.
- **Transactions** — Studios may *initiate* creator-side monetisation (royalty splits, paid-content flags, creator subscriptions) but, like products, never *process* them. Stripe and entitlement logic live in the platform. Studio UIs surface earnings, payout schedules, and tax-relevant data by querying the platform — never by computing them locally.

---

## Rules that only apply at this tier

- **One sub-studio writes to one Domain Service — without exception.** World Studio writes to World Model. Arc Studio writes to Narrative. Journey Studio writes to Journeys. If a feature spec needs to write to a second service, either split the feature or scope a new Studio. Don't work around this by having a Studio feature "read and transform" content that belongs in a different service's territory.
- **Full lifecycle or incomplete.** Every Studio feature spec must address what happens at each lifecycle stage: design (creation), deploy (publishing), manage (updates + moderation + enrolment oversight), retire (deprecation + archival + FIM impact). A feature that handles one or two stages without naming the others is under-specified.
- **Content can always come out.** Deprecation, archival, and retirement are mandatory concerns. A Studio that accepts creator content without an explicit retirement path is a trap — creators lose trust, and the platform accumulates orphaned content that nobody can cleanly remove. Feature specs that introduce new content types name the retirement pathway in the same spec.
- **Dreamineer permissions are group-role-based, not Studio-role-based.** Creator status is a group membership + role, resolved by Platform Core via `has_permission(...)` (ADR-U007). The Studio surface asks "can this FIM create a journey?" — it doesn't compute "is this a Dreamineer?" locally. Creator status can be granted, revoked, or restricted group-by-group, and the Studio must honour that.
- **Studios enforce constraints on creators; they don't trust creator input.** The World Model, cosmological canon, and platform safety bar are not optional. A Studio feature that lets a creator produce content inconsistent with locked canon is a feature that ships broken content. Constraints are checked at save, at publish, and at every lifecycle transition — not only once.
- **Creator-to-creator handover is a first-class flow.** Dreamineers hand content over to other Dreamineers, to groups, or to DeusEx (on abandonment). Every Studio that owns long-lived content must spec the handover mechanics. Authorship history is preserved across handovers; effective ownership changes.
- **Step types and content primitives are extensible (ADR-U008).** When a Studio needs a new step type or content primitive, extend the existing discriminator/type system — don't create parallel tables per type. The cost of this discipline is small; the cost of violating it cascades into every consuming product and every future Studio.

---

## Gotchas (tier-specific)

- **Draft vs published is not just a status field.** Draft content is private to the creator (and optional collaborators); published content is visible to consumers via the Platform API. RLS, caching, and the Platform API all behave differently for the two states. Studio features that change the draft/published state must account for cache invalidation, RLS transitions, and any downstream notifications.
- **Preview surfaces consume real data but must not leak real identities.** Creator previews of how content will appear to FIMs should look real but must not expose PII of actual FIMs who haven't opted into preview participation. Use synthetic or opted-in personas for preview rendering.
- **Cross-studio content references are constrained.** A journey (Journey Studio) may reference a world concept (World Studio) or narrative arc (Arc Studio), but the reference is one-way: the journey reads the world, not the reverse. World content doesn't know which journeys reference it. This keeps the seven Domain Services loosely coupled — preserve the direction in every cross-studio feature.
- **Arc Studio is Urd-scope — don't anticipate its contracts.** Journey Studio and World Studio must not hard-code assumptions about how Arc Studio will shape seasons and episodes. When a Journey Studio feature touches narrative structure, leave room for Arc Studio to own that structure later rather than baking it in now.

---

## Where to go next

- **Feature ID prefixes at this tier:** `WS` (World Studio), `AS` (Arc Studio), `JS` (Journey Studio), `US` (Universe Studio — umbrella-level features only). See `docs/studios/README.md`.
- **Studios:** [`universe-studio/`](./universe-studio/) (parent: umbrella + binding frame) containing [`world-studio/`](./universe-studio/world-studio/) (writes to World Model), [`arc-studio/`](./universe-studio/arc-studio/) (writes to Narrative, Urd) and [`journey-studio/`](./universe-studio/journey-studio/) (writes to Journeys, Eid+).
- **Relevant ADRs:** U002 (five verticals) · U007 (three-layer permission model) · U008 (step type extensibility) · U009 (API-first) · U017 (journeys as content templates) · U022 (named waves) · U024 (wave model semantics) · U025 (products as equipment profiles) · U026 (studio decomposition — Universe Studio as parent).
- **Relevant skills:** [`ecosystem-decomposition`](../../.claude/skills/ecosystem-decomposition/SKILL.md) when writing a Studio DESCRIPTION or feature spec; [`feature-development`](../../.claude/skills/feature-development/SKILL.md) when implementing a maturity-4 feature.
- **Sibling tier CLAUDE.md files:** [`../platform/CLAUDE.md`](../platform/CLAUDE.md) (when a Studio feature needs new capability in its target Domain Service) · [`../products/CLAUDE.md`](../products/CLAUDE.md) (when a product surface consumes Studio-authored content).
