# {Studio name} — Specification

---
slug: {universe-studio | universe-studio/world-studio | universe-studio/arc-studio | universe-studio/journey-studio}
owner: studios/{slug}
status: {draft | active | frozen}
last_updated: YYYY-MM-DD
tier: Surfaces
tags: [studio:{slug}]
feature_prefix: {US | WS | AS | JS}  # US=Universe Studio (umbrella/binding-frame), WS=World Studio, AS=Arc Studio, JS=Journey Studio (ADR-U026) — used for FEAT-*.md file naming
target_domain_service: {DS-1 World Model | DS-2 Narrative Engine | DS-3 Experience Engine}
---

> The inward-facing build spec for a studio surface. For developers who need to know how the thing actually works, what it depends on, and what its contracts are. Identity and "why" live in `DESCRIPTION.md` — don't repeat them here. Companion files: `DESCRIPTION.md` (outward-facing).

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

**Studio-tier note.** This template is the studio adaptation of the L2/L3/L4 partition skeleton shared with `product-specification.md` and `domain-service-spec.md`. Studio-specific load-bearing properties — the four-stage lifecycle commitment, the single-target-Domain-Service rule, and the constraints studios enforce on creator content — get their own L2 sections per `docs/studios/CLAUDE.md`. L3 uses the **capability inventory** content type, same as products and domain services.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision, the studios-tier `CLAUDE.md`, and the ecosystem anatomy. Revised when the studio's boundaries, technical surface, target Domain Service, lifecycle scope, or architectural position change.*

### 1. Surface

The authoring and lifecycle surface this studio exposes to creators.

- **Platform target:** {Next.js web · separate creator app · embedded in Hub · ...}
- **Repo location:** {paths within the monorepo, or external repo URL}
- **Build / deploy pipeline:** {summary or link}
- **Environments:** {dev, preview, prod URLs}
- **Primary persona:** Dreamineer · Weaver · Guide — name the creator role this surface serves and what creative practice they bring. (FIMs are not the persona here; FIMs interact with this studio's *output*, not the studio itself.)

### 2. Architecture position

Where this studio sits in the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U023):

- **Tier:** Surfaces (Studios)
- **Target Domain Service:** {DS-N: name} — this studio writes to this service. **Exactly one.** See §5 below for the contract.
- **Domain Services read (not written):** {list with the operations called — e.g., reading universe lore from World Model from inside Journey Studio}
- **Platform Core capabilities used:** {PC-1 Infrastructure · PC-2 Identity · PC-3 Organisation · PC-4 Governance — which, and for what (typically: PC-2 for creator authentication and `has_permission()` checks; PC-1 for RLS posture on draft content)}
- **Verticals it must satisfy:** all five (Administration · Privacy · Notifications · Observability · Transactions) per ADR-U002. Studio-tier obligations are summarised in `docs/studios/CLAUDE.md` §"Verticals: obligations on this tier"; per-capability detail lives in §L3.
- **Sibling studios it relates to:** {one-way references — e.g., Journey Studio reads World Studio's lore. The reference direction is one-way per `docs/studios/CLAUDE.md` "Cross-studio content references are constrained" rule; coherence across the set is held at the Universe Studio (parent) level per ADR-U026.}
- **Wave scope:** {Eid+ for Journey/World Studio · Urd for Arc Studio · ...}

### 3. Lifecycle commitment

Per `docs/studios/CLAUDE.md`, every studio capability must address the **four-stage lifecycle**: design (creation), deploy (publishing), manage (updates, moderation, enrolment oversight), retire (deprecation, archival, FIM impact). This section names how this studio *as a whole* discharges each stage. Per-capability detail lives in §L3.

| Stage | What this studio does | Notes |
|---|---|---|
| **Design** | {creation surfaces, draft semantics, collaborator model} | |
| **Deploy** | {publish flow, validation gate, who sees it after publish} | |
| **Manage** | {post-publish edits, moderation, enrolment dashboards, takeover flows} | |
| **Retire** | {deprecation pathway, archival, what happens to enrolled FIMs, handover-to-DeusEx flow} | |

If any stage is intentionally out of scope for the studio's current wave, name it here with the wave it lands in. If a stage is *unintentionally* unspecified, that's an L2 gap — surface in §10 Open spec questions.

### 4. Authentication & authorization

- **Creator status is group-role-based**, not studio-role-based. Resolved by Platform Core via `has_permission(...)` (ADR-U007). The studio asks "can this FIM create / edit / publish?" — it does not compute creator status locally.
- {How creator status is granted in this studio's domain — typically a group membership + role}
- {How it can be revoked or restricted; what happens to in-flight drafts when revoked}
- {Any studio-specific permission bits not in the global RBAC table}
- {DeusEx-only operations — force-archive, takeover, content removal — and the circumstances that authorise them}

### 5. Target Domain Service contract

The studio writes to **exactly one Domain Service** (per the `docs/studios/CLAUDE.md` constraint). This section specifies that contract.

- **Service:** {DS-N: name}
- **Tables / entities written:** {list, with brief shape}
- **Write semantics:** {transactional? eventual? validation-on-save vs validation-on-publish?}
- **Validation gate at publish:** {what checks fire — schema, canon, safety, cross-references}
- **Read scope inside this studio:** {which read paths this studio uses against its target service to power the authoring UI — drafts, history, sibling content, dependency graphs}
- **What the studio does NOT touch:** {tables in the target service that are owned by other writers — the runtime, other studios, or the platform itself — and how that boundary is enforced}

If a feature spec under this studio needs to write to a *second* Domain Service, that's a structural signal per CLAUDE.md: split the feature, scope a new studio, or surface as an open question in §10.

### 6. Data ownership

- **Tables this studio writes to** (in the target Domain Service, and any studio-local tables for authoring metadata): named here with their content-lifecycle state column (draft · published · deprecated · archived · retired).
- **Tables it only reads:** {cross-studio reads, lore lookups, etc.}
- **Storage buckets / CDN paths:** {creator-uploaded media, preview renders}
- **Draft vs published storage posture:** {are they in the same table with a status column, or separate tables? RLS implications either way.}
- **Authoring metadata vs content metadata:** {who edited what, when, with what audit trail — this is studio-local; the runtime content metadata is the target Domain Service's concern.}
- **Sync, offline, and caching strategy:** {how authoring state is preserved across sessions, what's cached client-side, what invalidates on publish}

### 7. Constraints enforced on creator content

Per `docs/studios/CLAUDE.md` "Studios enforce constraints on creators; they don't trust creator input": the World Model, cosmological canon, and platform safety bar are enforced at save, at publish, and at every lifecycle transition — not only once. This section names *which* constraints this studio enforces and *where* they fire.

- **World Model constraints:** {canonical entities, locked relationships, world-state rules this studio must not violate}
- **Cosmological canon constraints:** {worlds-topology boundaries per the cosmology core, Whisp interactions, locked cosmology this studio respects}
- **Platform safety / quality bar:** {moderation hooks, content-policy validation, reporting integration}
- **Where each constraint fires:** save · publish · republish · cross-reference resolution · retirement
- **What happens when a constraint fails:** {error surfaced to creator, draft saved with violation flag, publish blocked, etc.}

If new step types or content primitives are needed (per ADR-U008), extend the existing discriminator/type system rather than creating parallel tables — name that discipline here as well.

### 8. Cross-studio contracts

Studios reference each other one-way per `docs/studios/CLAUDE.md`: a journey may reference a universe concept; the universe doesn't know which journeys reference it. This section names the cross-studio surfaces.

- **What this studio reads from sibling studios:** {entity, read path, freshness expectation, what happens when the upstream changes}
- **What this studio's content makes available to sibling studios** (one-way, via the target Domain Service's read API): {semantic shape, stability guarantees}
- **Anti-coupling rules:** anything this studio explicitly does *not* assume about a sibling — particularly relevant for Journey Studio and World Studio not anticipating Arc Studio's contracts before Urd lands.

Breaking changes to anything sibling studios already consume trigger an ADR.

### 9. Operational concerns

- **Observability hooks:** content lifecycle events (publish, update, deprecate, retire, handover, takeover) as first-class observability — see CLAUDE.md "Content lifecycle events are first-class observability." Creator actions on their own content tracked separately from FIM interactions with that content.
- **Feature flags and how they're toggled:** {studio-specific or platform-wide}
- **Draft-vs-published cache invalidation:** {what bust on publish, what bust on retire, what's CDN-cached}
- **Preview surface rules:** previews look real but must not leak PII of FIMs who haven't opted into preview participation. Synthetic or opted-in personas only.
- **Known scaling limits and degradation modes:** {large drafts, many collaborators, deep dependency graphs}
- **Backup and disaster recovery posture:** {what's recoverable for creators if their authoring session is lost, what's recoverable if a publish goes wrong}

### 10. Open spec questions

L2-level questions still under design. Each is a candidate research spike or ADR.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the studio enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### Capabilities

Each capability is placed under its internal owner within the studio (typically the lifecycle stage it primarily serves: design / deploy / manage / retire), with internal dependencies, external dependencies (capabilities consumed from the target Domain Service, sibling studios, or Platform Core), and per-capability vertical impact named.

| Capability | Lifecycle stage | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| ... | design \| deploy \| manage \| retire | ... | ... | ... | ... |

The **Lifecycle stage** column makes the four-stage commitment from §3 visible at the capability level. A studio whose capabilities cluster entirely on one or two stages is incomplete by design — surface that as a finding.

The **Vertical impact** column lists which of Administration / Privacy / Notifications / Observability / Transactions this capability touches, with one short phrase per vertical it touches. Verticals it doesn't touch are omitted from the cell. The rules each capability must satisfy per vertical live in the corresponding vertical's `SPECIFICATION.md` (§L3 Obligation inventory).

### Dependency chain

Prose or diagram showing the order in which capabilities become buildable. A capability that depends on another must wait for that dependency's capability inventory to be stable (and, eventually, for the dependency's feature spec to reach maturity 4-ready). For studios, the dependency chain typically runs: design capabilities first → deploy capabilities (depend on design + the target DS publish path) → manage capabilities (depend on deploy + observability) → retire capabilities (depend on the full lifecycle being in place).

### External dependencies

Capabilities this studio consumes from other entities. Each entry names the source entity, the capability consumed, and the consuming internal area. Cross-reference these entries against the source entity's own capability inventory; if the capability isn't there, surface as a boundary question.

Common external dependency sources for studios:
- **Target Domain Service** — write/read paths, validation hooks, lifecycle-state transitions
- **Platform Core** — `has_permission()`, RLS helpers, feature flags, audit log
- **Sibling studios** (one-way reads only) — lore lookups, narrative-arc references, content cross-references
- **Verticals** — the obligations levied by Administration / Privacy / Notifications / Observability / Transactions

### Sources-status block

The `ecosystem-decomposition` skill's prerequisite-check pause mechanic produces remarks when upstream thinking is inadequate but the author proceeds anyway. Record those remarks here — one line per remark, with the upstream gap and a cross-reference to `docs/ecosystem/how-we-work/gaps.md` (e.g., G-03 for scaffold vertical specs).

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-*.md` file under this studio's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`.*

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| ... | FEAT-{PREFIX}{NNN} | 0–6 | ... |

One row per feature spec. A capability with multiple feature specs has multiple rows. A capability with no spec gets a row with Feature spec = "—" and Maturity = "—".

### Capabilities without specs

Capabilities from §L3 that do not yet have a corresponding `FEAT-*.md` file. These are candidates for future L4 runs.

- {Capability name} — {short note on why not yet specified, if useful}

### Features without capabilities

If any `FEAT-*.md` files exist under this studio's `features/` directory that do not map to a capability in §L3, they're listed here. This should normally be empty; a non-empty list is a signal of drift and surfaces as a reconciliation finding.

- {FEAT-ID} — {short note}

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle. See `docs/studios/CLAUDE.md` for the studios-tier obligations this template encodes.*
