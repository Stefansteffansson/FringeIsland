# CLAUDE.md — Verticals tier

**Applies to:** anything under `docs/verticals/` — the five vertical spec files and any related checklist or tooling documentation.
**Load order:** root [`CLAUDE.md`](../../CLAUDE.md) → [`AGENTS.md`](../../AGENTS.md) → [`PROCESS.md`](../planning/PROCESS.md) → the skill matching the task → **this file** → the specific vertical spec (e.g. `privacy.md`).
**Reads as a delta.** Assumes root `CLAUDE.md` is already loaded. Contains only what's specific to verticals-tier work.

---

## What makes this tier different

Verticals are **obligations on every tier, not services** (ADR-U002). There are five of them, locked: V1 Administration · V2 Privacy/GDPR · V3 Notifications · V4 Observability · V5 Transactions. They don't own code, don't have APIs, don't have features in the same sense products and services do. What they own is a **promise** — a cross-cutting concern that every platform, domain service, product, and studio must fulfil regardless of what else they're doing.

Working at this tier means writing or maintaining the five canonical spec files that define what each vertical obligates. These specs are read by every feature-spec author (to complete the Vertical Impact section) and by the `doc-health-check` skill (to verify DoD compliance). A vertical spec that's vague, aspirational, or inconsistent with reality makes every downstream feature spec weaker. Precision at this tier is load-bearing.

The five spec files already exist as scaffolds (`administration.md`, `privacy.md`, `notifications.md`, `observability.md`, `transactions.md`) following `../templates/vertical-spec.md`. Work at this tier is almost always refinement — tightening scope, populating failure modes, adding concrete checklists — rather than greenfield authoring.

---

## What each vertical spec must specify

Every vertical spec follows the same seven-section shape (see `../templates/vertical-spec.md`). Here's what each section is for — the discipline that makes a vertical spec useful rather than decorative:

- **Purpose (§1)** — Why this vertical exists and what goes wrong if it isn't satisfied. Not platitudes ("privacy matters"); concrete failure consequences ("mishandled money is the fastest way to destroy trust"). One paragraph, high signal.
- **Scope (§2)** — What the vertical covers, specifically enough to be enforceable. "Privacy" alone is too vague to act on; "lawful basis, consent capture, export, erasure, AI opt-out, records of processing" is a scope that a feature spec can check itself against.
- **Obligations on each tier (§3)** — Separate subsections for **Platform Core**, **Domain Services**, and **Surfaces** (Products + Studios + Design System). Each subsection names concrete asks ("Identity service stores consent state per user, per category"). If the ask varies by service or product, list per-service/per-product. Vague obligations here propagate vagueness into every feature spec.
- **Cross-cutting checklists (§4)** — Short, machine-checkable checklist a developer can run against any new feature. These feed directly into Definition of Done (PROCESS.md §5). A good checklist item is verifiable without interpretation.
- **Tooling and infrastructure (§5)** — What shared infrastructure exists so this vertical is cheap to satisfy. If every feature has to reimplement the obligation, the tooling is missing — flag it.
- **Failure modes (§6)** — What breaks when the vertical is violated, how it's detected, how it's recovered. This is the section that distinguishes an enforceable vertical from an aspirational one.
- **Open questions (§7)** — Decisions still owed. Each is a candidate ADR or spike. Open questions are honest; unacknowledged gaps are drift.

---

## Rules that only apply at this tier

- **The five verticals are locked — don't add a sixth.** ADR-U002 locks the set at five and explains why. A sixth vertical requires an ADR that either splits an existing one or absorbs something currently handled elsewhere — never "we needed a new concern." The five cover every cross-cutting obligation at the current architectural decomposition.
- **Obligations must be tier-specific, not generic.** "Every service must log" is weak. "Each service emits one log entry per API call at the appropriate level, increments a metric for count + duration, and writes an audit-log entry for every security-relevant action" is enforceable. Rewrite any bullet that sounds like a slogan until it sounds like a checklist.
- **Checklists feed DoD.** Every item in §4 of a vertical spec is a candidate DoD check. When a vertical spec adds a checklist item, the corresponding DoD section in PROCESS.md §5 should reflect it — don't let the two drift.
- **Every feature spec addresses every vertical — no blank slots.** This is enforced in AGENTS.md as an always-do. The vertical specs are what those feature-spec sections check themselves against. A vertical spec that's too vague to check against is a vertical that gets skipped in Vertical Impact sections; the vagueness becomes invisible.
- **Open questions are owned.** §7 of every spec is a list of candidate ADRs and spikes. When a vertical spec carries an open question for more than one wave boundary without progress, surface it — unresolved questions at the verticals tier mean every downstream feature is making an implicit assumption about something that should be an explicit decision.
- **Vertical specs are not retired; they evolve.** Unlike feature specs that reach 6-done and stop changing, vertical specs stay live. Legal landscape shifts, new privacy regulations land, new observability tools appear. Versioning via amendment (like ADR-U002's 2026-04-12 amendment) is the pattern, not deletion and re-authoring.

---

## Gotchas (tier-specific)

- **Over-prescription kills verticals.** A privacy spec that tries to enumerate every field in every table will be wrong within a month. Specify the *rule* ("every new personal data field has a documented lawful basis") not the *inventory*. Let the feature specs and code be the current inventory; the vertical spec is the invariant.
- **"Applies to every tier" is not the same as "is identical on every tier."** Each tier has its own obligations. Privacy on Platform Core is about RLS and consent storage; Privacy on Surfaces is about affordance design. The spec's §3 must show the difference, not paper over it with shared language.
- **Vertical specs and the Five Verticals section in each tier's `CLAUDE.md` must agree.** Each tier-level `CLAUDE.md` has a "Verticals: obligations on this tier" section. Those sections derive their content from these specs. If a vertical spec changes its §3 obligations, the four tier-level CLAUDE.md files may need matching updates. The `doc-health-check` skill's Section 1 (terminology drift) does not currently catch this — verify manually when editing.
- **Retired phase-model language is drift.** The original scaffolds (pre 2026-04-17) carried "Phase 3 scaffold / Phase 4 fill-in" footers. That framing is drift per the `doc-health-check` skill's Section 1.5 (Phase 1/2/3/4 model is superseded by the wave model). As of 2026-04-17 the five spec footers read "Scaffold — refine in place …". If old phase-model language reappears, rewrite the footer to reference the current wave or use the scaffold-living-document framing.
- **"old_*" tree references are drift.** Those trees no longer exist (deleted 2026-04-12 and 2026-04-15). The spec scaffolds originally pointed at `../old_implementation/` for some content; those references were cut in the 2026-04-17 fix. When adding new content, cite the live codebase or current docs — never the deleted trees.

---

## Where to go next

- **Feature ID prefix at this tier:** `V` (Verticals). See `docs/verticals/README.md`.
- **The five spec files:** [`administration.md`](./administration.md) · [`privacy.md`](./privacy.md) · [`notifications.md`](./notifications.md) · [`observability.md`](./observability.md) · [`transactions.md`](./transactions.md).
- **Template:** [`../templates/vertical-spec.md`](../templates/vertical-spec.md) — the canonical shape every spec follows.
- **Relevant ADRs:** U002 (five cross-cutting verticals) · U010 (privacy as dedicated vertical) · U011 (transactions via Stripe Connect) · U012 (observability as dedicated vertical) · U013 (i18n/a11y constraints) · U022 (named waves) · U024 (wave model semantics).
- **Relevant skills:** [`ecosystem-decomposition`](../../.claude/skills/ecosystem-decomposition/SKILL.md) when refining a vertical spec; [`doc-health-check`](../../.claude/skills/doc-health-check/SKILL.md) to verify vertical checklists are kept in sync with DoD.
- **Sibling tier CLAUDE.md files:** [`../products/CLAUDE.md`](../products/CLAUDE.md) · [`../platform/CLAUDE.md`](../platform/CLAUDE.md) · [`../studios/CLAUDE.md`](../studios/CLAUDE.md) · [`../design-system/CLAUDE.md`](../design-system/CLAUDE.md) — each has a "Verticals: obligations on this tier" section that derives from these five specs.
